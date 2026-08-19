// Serializer

const isMixed = (value) => typeof value === "symbol";

const toHex = (color) => {
  const clamp = (v) => Math.min(255, Math.max(0, Math.round(v * 255)));
  const [r, g, b] = [clamp(color.r), clamp(color.g), clamp(color.b)];
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

const serializePaints = (paints) => {
  if (isMixed(paints) || !paints || !Array.isArray(paints)) {
    return isMixed(paints) ? "mixed" : [];
  }
  return paints
    .filter((paint) => paint.type === "SOLID" && "color" in paint)
    .map((paint) => ({
      type: paint.type,
      color: paint.type === "SOLID" ? toHex(paint.color) : undefined,
      opacity: paint.opacity,
    }));
};

const getBounds = (node) => {
  if ("x" in node && "y" in node && "width" in node && "height" in node) {
    return { x: node.x, y: node.y, width: node.width, height: node.height };
  }
  return undefined;
};

const serializeStyles = (node) => {
  const styles = {};
  if ("fills" in node) styles.fills = serializePaints(node.fills);
  if ("strokes" in node) styles.strokes = serializePaints(node.strokes);
  if ("cornerRadius" in node) {
    styles.cornerRadius = isMixed(node.cornerRadius) ? "mixed" : node.cornerRadius;
  }
  if ("paddingLeft" in node) {
    styles.padding = {
      top: node.paddingTop,
      right: node.paddingRight,
      bottom: node.paddingBottom,
      left: node.paddingLeft,
    };
  }
  return styles;
};

const serializeText = (node, base) => {
  let font;
  if (typeof node.fontName === "symbol") {
    font = "mixed";
  } else if (node.fontName) {
    font = node.fontName.family;
  }
  return Object.assign({}, base, {
    characters: node.characters,
    styles: Object.assign({}, base.styles, {
      fontSize: isMixed(node.fontSize) ? "mixed" : node.fontSize,
      fontFamily: font,
      textAlignHorizontal: isMixed(node.textAlignHorizontal) ? "mixed" : node.textAlignHorizontal,
    }),
  });
};

const serializeNode = (node) => {
  const base = {
    id: node.id,
    name: node.name,
    type: node.type,
    bounds: getBounds(node),
    styles: serializeStyles(node),
  };
  if (node.type === "TEXT") return serializeText(node, base);
  if ("children" in node) {
    return Object.assign({}, base, { children: node.children.map((child) => serializeNode(child)) });
  }
  return base;
};

// Plugin core

const sendStatus = () => {
  figma.ui.postMessage({
    type: "plugin-status",
    payload: {
      fileName: figma.root.name,
      selectionCount: figma.currentPage.selection.length,
    },
  });
};

const serializeVariableValue = (value) => {
  if (typeof value === "object" && value !== null) {
    if ("type" in value && value.type === "VARIABLE_ALIAS") {
      return { type: "VARIABLE_ALIAS", id: value.id };
    }
    if ("r" in value && "g" in value && "b" in value) {
      return { type: "COLOR", r: value.r, g: value.g, b: value.b, a: "a" in value ? value.a : 1 };
    }
  }
  return value;
};

const fromHex = (value) => {
  const hex = String(value || "#000000").replace(/^#/, "");
  if (![3, 4, 6, 8].includes(hex.length)) throw new Error(`Invalid hex color: ${value}`);
  const expanded = hex.length <= 4 ? hex.split("").map((c) => c + c).join("") : hex;
  const hasAlpha = expanded.length === 8;
  return {
    color: {
      r: parseInt(expanded.slice(0, 2), 16) / 255,
      g: parseInt(expanded.slice(2, 4), 16) / 255,
      b: parseInt(expanded.slice(4, 6), 16) / 255,
    },
    opacity: hasAlpha ? parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  };
};

const solidPaint = (value, opacity = 1) => {
  const parsed = fromHex(value);
  return { type: "SOLID", color: parsed.color, opacity: parsed.opacity * opacity };
};

const getParent = async (parentId) => {
  if (!parentId) return figma.currentPage;
  const parent = await figma.getNodeByIdAsync(parentId);
  if (!parent || !("appendChild" in parent)) throw new Error(`Invalid parent node: ${parentId}`);
  if (parent.type === "PAGE") await parent.loadAsync();
  return parent;
};

const applyPosition = (node, params) => {
  if (params.x != null) node.x = params.x;
  if (params.y != null) node.y = params.y;
};

const applyFrameLayout = (node, params) => {
  if (params.layoutMode != null) node.layoutMode = params.layoutMode;
  if (params.layoutWrap != null) node.layoutWrap = params.layoutWrap;
  if (params.primaryAxisSizingMode != null) node.primaryAxisSizingMode = params.primaryAxisSizingMode;
  if (params.counterAxisSizingMode != null) node.counterAxisSizingMode = params.counterAxisSizingMode;
  if (params.primaryAxisAlignItems != null) node.primaryAxisAlignItems = params.primaryAxisAlignItems;
  if (params.counterAxisAlignItems != null) node.counterAxisAlignItems = params.counterAxisAlignItems;
  if (params.itemSpacing != null) node.itemSpacing = params.itemSpacing;
  if (params.counterAxisSpacing != null) node.counterAxisSpacing = params.counterAxisSpacing;
  if (params.paddingTop != null) node.paddingTop = params.paddingTop;
  if (params.paddingRight != null) node.paddingRight = params.paddingRight;
  if (params.paddingBottom != null) node.paddingBottom = params.paddingBottom;
  if (params.paddingLeft != null) node.paddingLeft = params.paddingLeft;
};

const responseNode = (request, node, extra = {}) => ({
  type: request.type,
  requestId: request.requestId,
  data: Object.assign({ node: serializeNode(node), nodeId: node.id }, extra),
});

const requestNodeId = (request, params) =>
  (request.nodeIds && request.nodeIds[0]) || (params && params.nodeId);

const handleRequest = async (request) => {
  try {
    switch (request.type) {
      case "get_document":
        return { type: request.type, requestId: request.requestId, data: serializeNode(figma.currentPage) };

      case "get_selection":
        return {
          type: request.type,
          requestId: request.requestId,
          data: figma.currentPage.selection.map((node) => serializeNode(node)),
        };

      case "get_node": {
        const nodeId = request.nodeIds && request.nodeIds[0];
        if (!nodeId) throw new Error("nodeIds is required for get_node");
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node || node.type === "DOCUMENT") throw new Error(`Node not found: ${nodeId}`);
        return { type: request.type, requestId: request.requestId, data: serializeNode(node) };
      }

      case "get_styles": {
        const [paintStyles, textStyles, effectStyles, gridStyles] = await Promise.all([
          figma.getLocalPaintStylesAsync(),
          figma.getLocalTextStylesAsync(),
          figma.getLocalEffectStylesAsync(),
          figma.getLocalGridStylesAsync(),
        ]);
        return {
          type: request.type,
          requestId: request.requestId,
          data: {
            paints: paintStyles.map((s) => ({ id: s.id, name: s.name, paints: s.paints })),
            text: textStyles.map((s) => ({ id: s.id, name: s.name, fontSize: s.fontSize, fontName: s.fontName })),
            effects: effectStyles.map((s) => ({ id: s.id, name: s.name, effects: s.effects })),
            grids: gridStyles.map((s) => ({ id: s.id, name: s.name, layoutGrids: s.layoutGrids })),
          },
        };
      }

      case "get_metadata":
        return {
          type: request.type,
          requestId: request.requestId,
          data: {
            fileName: figma.root.name,
            currentPageId: figma.currentPage.id,
            currentPageName: figma.currentPage.name,
            pageCount: figma.root.children.length,
            pages: figma.root.children.map((page) => ({ id: page.id, name: page.name })),
          },
        };

      case "get_design_context": {
        const depth = (request.params && request.params.depth != null) ? request.params.depth : 2;
        const serializeWithDepth = async (node, currentDepth) => {
          const serialized = serializeNode(node);
          if (currentDepth >= depth && serialized.children) {
            return Object.assign({}, serialized, { children: undefined, childCount: node.children ? node.children.length : 0 });
          }
          if (serialized.children) {
            const childNodes = await Promise.all(serialized.children.map((child) => figma.getNodeByIdAsync(child.id)));
            const serializedChildren = await Promise.all(
              childNodes
                .filter((n) => n !== null && n.type !== "DOCUMENT")
                .map((n) => serializeWithDepth(n, currentDepth + 1))
            );
            return Object.assign({}, serialized, { children: serializedChildren });
          }
          return serialized;
        };
        const selection = figma.currentPage.selection;
        const contextNodes =
          selection.length > 0
            ? await Promise.all(selection.map((node) => serializeWithDepth(node, 0)))
            : [await serializeWithDepth(figma.currentPage, 0)];
        return {
          type: request.type,
          requestId: request.requestId,
          data: {
            fileName: figma.root.name,
            currentPage: { id: figma.currentPage.id, name: figma.currentPage.name },
            selectionCount: selection.length,
            context: contextNodes,
          },
        };
      }

      case "get_variable_defs": {
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        const variableData = await Promise.all(
          collections.map(async (collection) => {
            const variables = await Promise.all(
              collection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id))
            );
            return {
              id: collection.id,
              name: collection.name,
              modes: collection.modes.map((mode) => ({ modeId: mode.modeId, name: mode.name })),
              variables: variables
                .filter((v) => v !== null)
                .map((variable) => ({
                  id: variable.id,
                  name: variable.name,
                  resolvedType: variable.resolvedType,
                  valuesByMode: Object.fromEntries(
                    Object.entries(variable.valuesByMode).map(([modeId, value]) => [modeId, serializeVariableValue(value)])
                  ),
                })),
            };
          })
        );
        return { type: request.type, requestId: request.requestId, data: { collections: variableData } };
      }

      case "get_screenshot": {
        const format = (request.params && request.params.format) ? request.params.format : "PNG";
        const scale = (request.params && request.params.scale != null) ? request.params.scale : 2;
        let targetNodes;
        if (request.nodeIds && request.nodeIds.length > 0) {
          const nodes = await Promise.all(request.nodeIds.map((id) => figma.getNodeByIdAsync(id)));
          targetNodes = nodes.filter((n) => n !== null && n.type !== "DOCUMENT" && n.type !== "PAGE");
        } else {
          targetNodes = figma.currentPage.selection.slice();
        }
        if (targetNodes.length === 0) throw new Error("No nodes to export. Select nodes or provide nodeIds.");
        const exports = await Promise.all(
          targetNodes.map(async (node) => {
            const settings =
              format === "SVG" ? { format: "SVG" }
              : format === "PDF" ? { format: "PDF" }
              : format === "JPG" ? { format: "JPG", constraint: { type: "SCALE", value: scale } }
              : { format: "PNG", constraint: { type: "SCALE", value: scale } };
            const bytes = await node.exportAsync(settings);
            const base64 = figma.base64Encode(bytes);
            return { nodeId: node.id, nodeName: node.name, format, base64, width: node.width, height: node.height };
          })
        );
        return { type: request.type, requestId: request.requestId, data: { exports } };
      }

      case "get_nodes_info": {
        if (!request.nodeIds || request.nodeIds.length === 0) throw new Error("nodeIds is required for get_nodes_info");
        const nodes = await Promise.all(request.nodeIds.map((id) => figma.getNodeByIdAsync(id)));
        return {
          type: request.type,
          requestId: request.requestId,
          data: nodes.filter((n) => n !== null && n.type !== "DOCUMENT").map((n) => serializeNode(n)),
        };
      }

      case "get_local_components": {
        const pages = figma.root.children;
        const allComponents = [];
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          await page.loadAsync();
          const pageComponents = page.findAllWithCriteria({ types: ["COMPONENT"] });
          for (const component of pageComponents) {
            allComponents.push({
              id: component.id,
              name: component.name,
              key: "key" in component ? component.key : null,
            });
          }
          figma.ui.postMessage({
            type: "progress_update",
            requestId: request.requestId,
            progress: Math.round(((i + 1) / pages.length) * 90) + 1,
            message: `Scanned ${page.name}: ${allComponents.length} components so far`,
          });
          await new Promise((r) => setTimeout(r, 0));
        }
        return { type: request.type, requestId: request.requestId, data: { count: allComponents.length, components: allComponents } };
      }

      case "get_annotations": {
        const nodeId = request.params && request.params.nodeId;
        const nodeAnnotations = (n) => {
          const anns = n.annotations;
          return Array.isArray(anns) ? anns : null;
        };
        if (nodeId) {
          const node = await figma.getNodeByIdAsync(nodeId);
          if (!node) throw new Error(`Node not found: ${nodeId}`);
          const mergedAnnotations = [];
          const collect = async (n) => {
            const anns = nodeAnnotations(n);
            if (anns) for (const a of anns) mergedAnnotations.push({ nodeId: n.id, annotation: a });
            if ("children" in n) for (const child of n.children) await collect(child);
          };
          await collect(node);
          return { type: request.type, requestId: request.requestId, data: { nodeId: node.id, name: node.name, annotations: mergedAnnotations } };
        } else {
          const annotated = [];
          const processNode = async (n) => {
            const anns = nodeAnnotations(n);
            if (anns && anns.length > 0) annotated.push({ nodeId: n.id, name: n.name, annotations: anns });
            if ("children" in n) for (const child of n.children) await processNode(child);
          };
          await processNode(figma.currentPage);
          return { type: request.type, requestId: request.requestId, data: { annotatedNodes: annotated } };
        }
      }

      case "scan_text_nodes": {
        const nodeId = request.params && request.params.nodeId;
        if (!nodeId) throw new Error("nodeId is required for scan_text_nodes");
        const root = await figma.getNodeByIdAsync(nodeId);
        if (!root) throw new Error(`Node not found: ${nodeId}`);
        const textNodes = [];
        const findText = async (n) => {
          if (n.type === "TEXT") {
            textNodes.push({ id: n.id, name: n.name, characters: n.characters, fontSize: n.fontSize, fontName: n.fontName });
          }
          if ("children" in n) for (const child of n.children) await findText(child);
        };
        figma.ui.postMessage({ type: "progress_update", requestId: request.requestId, progress: 10, message: "Scanning text nodes..." });
        await new Promise((r) => setTimeout(r, 0));
        await findText(root);
        return { type: request.type, requestId: request.requestId, data: { count: textNodes.length, textNodes } };
      }

      case "scan_nodes_by_types": {
        const nodeId = request.params && request.params.nodeId;
        const types = (request.params && request.params.types) ? request.params.types : [];
        if (!nodeId) throw new Error("nodeId is required for scan_nodes_by_types");
        if (types.length === 0) throw new Error("types must be a non-empty array");
        const root = await figma.getNodeByIdAsync(nodeId);
        if (!root) throw new Error(`Node not found: ${nodeId}`);
        const matchingNodes = [];
        const findByTypes = async (n) => {
          if ("visible" in n && !n.visible) return;
          if (types.includes(n.type)) {
            matchingNodes.push({
              id: n.id,
              name: n.name,
              type: n.type,
              bbox: { x: "x" in n ? n.x : 0, y: "y" in n ? n.y : 0, width: "width" in n ? n.width : 0, height: "height" in n ? n.height : 0 },
            });
          }
          if ("children" in n) for (const child of n.children) await findByTypes(child);
        };
        figma.ui.postMessage({ type: "progress_update", requestId: request.requestId, progress: 10, message: `Scanning for types: ${types.join(", ")}...` });
        await new Promise((r) => setTimeout(r, 0));
        await findByTypes(root);
        return { type: request.type, requestId: request.requestId, data: { count: matchingNodes.length, matchingNodes, searchedTypes: types } };
      }

      case "get_pages":
        return {
          type: request.type,
          requestId: request.requestId,
          data: { pages: figma.root.children.map((page) => ({ id: page.id, name: page.name })) },
        };

      case "navigate_to_page": {
        const p = request.params || {};
        const page = p.pageId
          ? await figma.getNodeByIdAsync(p.pageId)
          : figma.root.children.find((candidate) => candidate.name === p.pageName);
        if (!page || page.type !== "PAGE") throw new Error("Page not found");
        await figma.setCurrentPageAsync(page);
        return { type: request.type, requestId: request.requestId, data: { pageId: page.id, pageName: page.name } };
      }

      case "create_frame": {
        const p = request.params || {};
        const parent = await getParent(p.parentId);
        const node = figma.createFrame();
        node.name = p.name || "Frame";
        parent.appendChild(node);
        node.resize(p.width || 100, p.height || 100);
        applyFrameLayout(node, p);
        applyPosition(node, p);
        if (p.fillColor) node.fills = [solidPaint(p.fillColor)];
        return responseNode(request, node);
      }

      case "create_section": {
        const p = request.params || {};
        const node = figma.createSection();
        node.name = p.name || "Section";
        node.resizeWithoutConstraints(p.width || 100, p.height || 100);
        applyPosition(node, p);
        return responseNode(request, node);
      }

      case "create_rectangle":
      case "create_ellipse": {
        const p = request.params || {};
        const parent = await getParent(p.parentId);
        const node = request.type === "create_rectangle" ? figma.createRectangle() : figma.createEllipse();
        node.name = p.name || (request.type === "create_rectangle" ? "Rectangle" : "Ellipse");
        parent.appendChild(node);
        node.resize(p.width || 100, p.height || 100);
        applyPosition(node, p);
        if (p.fillColor) node.fills = [solidPaint(p.fillColor)];
        if (p.cornerRadius != null && "cornerRadius" in node) node.cornerRadius = p.cornerRadius;
        return responseNode(request, node);
      }

      case "create_text": {
        const p = request.params || {};
        const parent = await getParent(p.parentId);
        const fontName = { family: p.fontFamily || "Inter", style: p.fontStyle || "Regular" };
        await figma.loadFontAsync(fontName);
        const node = figma.createText();
        node.name = p.name || p.text || "Text";
        node.fontName = fontName;
        node.characters = p.text || "";
        if (p.fontSize != null) node.fontSize = p.fontSize;
        if (p.fillColor) node.fills = [solidPaint(p.fillColor)];
        parent.appendChild(node);
        applyPosition(node, p);
        return responseNode(request, node);
      }

      case "set_auto_layout": {
        const p = request.params || {};
        const nodeId = requestNodeId(request, p);
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node || !("layoutMode" in node)) throw new Error(`Auto-layout node not found: ${nodeId}`);
        applyFrameLayout(node, p);
        return responseNode(request, node);
      }

      case "set_fills": {
        const p = request.params || {};
        const nodeId = requestNodeId(request, p);
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node || !("fills" in node)) throw new Error(`Fillable node not found: ${nodeId}`);
        const paint = solidPaint(p.color, p.opacity == null ? 1 : p.opacity);
        node.fills = p.mode === "append" && Array.isArray(node.fills) ? [...node.fills, paint] : [paint];
        return responseNode(request, node);
      }

      case "set_strokes": {
        const p = request.params || {};
        const nodeId = requestNodeId(request, p);
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node || !("strokes" in node)) throw new Error(`Strokeable node not found: ${nodeId}`);
        const paint = solidPaint(p.color);
        node.strokes = p.mode === "append" && Array.isArray(node.strokes) ? [...node.strokes, paint] : [paint];
        if (p.strokeWeight != null) node.strokeWeight = p.strokeWeight;
        return responseNode(request, node);
      }

      case "set_corner_radius": {
        const p = request.params || {};
        const ids = request.nodeIds || p.nodeIds || [];
        const nodes = await Promise.all(ids.map((id) => figma.getNodeByIdAsync(id)));
        const changed = nodes.filter(Boolean);
        for (const node of changed) {
          if (p.cornerRadius != null) node.cornerRadius = p.cornerRadius;
          if (p.topLeftRadius != null) node.topLeftRadius = p.topLeftRadius;
          if (p.topRightRadius != null) node.topRightRadius = p.topRightRadius;
          if (p.bottomLeftRadius != null) node.bottomLeftRadius = p.bottomLeftRadius;
          if (p.bottomRightRadius != null) node.bottomRightRadius = p.bottomRightRadius;
        }
        return { type: request.type, requestId: request.requestId, data: { nodeIds: changed.map((node) => node.id) } };
      }

      case "set_effects": {
        const p = request.params || {};
        const nodeId = requestNodeId(request, p);
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node || !("effects" in node)) throw new Error(`Effect node not found: ${nodeId}`);
        node.effects = (p.effects || []).map((effect) => {
          if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
            return { type: effect.type, radius: effect.radius || 4, visible: effect.visible !== false };
          }
          const parsed = fromHex(effect.color || "#000000");
          return {
            type: effect.type || "DROP_SHADOW",
            color: Object.assign({}, parsed.color, { a: (effect.opacity == null ? 0.25 : effect.opacity) * parsed.opacity }),
            offset: { x: effect.offsetX || 0, y: effect.offsetY == null ? 4 : effect.offsetY },
            radius: effect.radius == null ? 8 : effect.radius,
            spread: effect.spread || 0,
            visible: effect.visible !== false,
            blendMode: "NORMAL",
          };
        });
        return responseNode(request, node);
      }

      case "move_nodes":
      case "resize_nodes":
      case "set_opacity": {
        const p = request.params || {};
        const ids = request.nodeIds || p.nodeIds || [];
        const nodes = (await Promise.all(ids.map((id) => figma.getNodeByIdAsync(id)))).filter(Boolean);
        for (const node of nodes) {
          if (request.type === "move_nodes") applyPosition(node, p);
          if (request.type === "resize_nodes") node.resize(p.width || node.width, p.height || node.height);
          if (request.type === "set_opacity") node.opacity = p.opacity;
        }
        return { type: request.type, requestId: request.requestId, data: { nodeIds: nodes.map((node) => node.id) } };
      }

      case "reparent_nodes": {
        const p = request.params || {};
        const parent = await getParent(p.parentId);
        const ids = request.nodeIds || p.nodeIds || [];
        const nodes = (await Promise.all(ids.map((id) => figma.getNodeByIdAsync(id)))).filter(Boolean);
        for (const node of nodes) parent.appendChild(node);
        return { type: request.type, requestId: request.requestId, data: { nodeIds: nodes.map((node) => node.id), parentId: parent.id } };
      }

      case "clone_node": {
        const p = request.params || {};
        const nodeId = requestNodeId(request, p);
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node || !("clone" in node)) throw new Error(`Cloneable node not found: ${nodeId}`);
        const clone = node.clone();
        const parent = p.parentId ? await getParent(p.parentId) : node.parent;
        if (parent && "appendChild" in parent) parent.appendChild(clone);
        applyPosition(clone, p);
        return responseNode(request, clone, { sourceNodeId: node.id });
      }

      case "create_component": {
        const p = request.params || {};
        const nodeId = requestNodeId(request, p);
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node || node.type !== "FRAME") throw new Error(`Frame not found: ${nodeId}`);
        const component = figma.createComponentFromNode(node);
        component.name = p.name || component.name;
        return responseNode(request, component);
      }

      case "apply_style_to_node": {
        const p = request.params || {};
        const nodeId = requestNodeId(request, p);
        const [node, style] = await Promise.all([figma.getNodeByIdAsync(nodeId), figma.getStyleByIdAsync(p.styleId)]);
        if (!node || !style) throw new Error("Node or style not found");
        if (style.type === "TEXT" && node.type === "TEXT") node.textStyleId = style.id;
        else if (style.type === "EFFECT" && "effectStyleId" in node) node.effectStyleId = style.id;
        else if (style.type === "PAINT" && "fillStyleId" in node) {
          if (p.target === "stroke") node.strokeStyleId = style.id;
          else node.fillStyleId = style.id;
        } else if (style.type === "GRID" && "gridStyleId" in node) node.gridStyleId = style.id;
        else throw new Error(`Style ${style.type} cannot be applied to ${node.type}`);
        return responseNode(request, node, { styleId: style.id });
      }

      case "rename_node":
      case "set_text": {
        const p = request.params || {};
        const nodeId = requestNodeId(request, p);
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node) throw new Error(`Node not found: ${nodeId}`);
        if (request.type === "rename_node") node.name = p.name;
        else {
          if (node.type !== "TEXT") throw new Error(`Text node not found: ${nodeId}`);
          const fonts = node.getStyledTextSegments(["fontName"]).map((segment) => segment.fontName);
          await Promise.all(fonts.map((font) => figma.loadFontAsync(font)));
          node.characters = p.text;
        }
        return responseNode(request, node);
      }

      case "delete_nodes": {
        const p = request.params || {};
        const ids = request.nodeIds || p.nodeIds || [];
        const nodes = (await Promise.all(ids.map((id) => figma.getNodeByIdAsync(id)))).filter(Boolean);
        for (const node of nodes) node.remove();
        return { type: request.type, requestId: request.requestId, data: { deletedNodeIds: ids } };
      }

      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  } catch (error) {
    return {
      type: request.type,
      requestId: request.requestId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

figma.showUI(__html__, { width: 320, height: 180 });
sendStatus();

figma.on("selectionchange", () => {
  sendStatus();
});

figma.ui.onmessage = async (message) => {
  if (message.type === "ui-ready") {
    sendStatus();
    return;
  }
  if (message.type === "server-request") {
    const response = await handleRequest(message.payload);
    try {
      figma.ui.postMessage(response);
    } catch (err) {
      figma.ui.postMessage({
        type: response.type,
        requestId: response.requestId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
