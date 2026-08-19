type CreateShapesMessage = {
  type: 'create-shapes';
  count: number;
};

type RunMcpMessage = {
  type: 'run-mcp';
  endpoint: string;
  payload: string;
};

type CancelMessage = {
  type: 'cancel';
};

type PluginMessage = CreateShapesMessage | RunMcpMessage | CancelMessage;

figma.showUI(__html__, { width: 420, height: 620 });

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'create-shapes') {
    const numberOfRectangles = msg.count;
    const nodes: SceneNode[] = [];

    for (let i = 0; i < numberOfRectangles; i++) {
      const rect = figma.createRectangle();
      rect.x = i * 150;
      rect.y = 0;
      rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }];
      rect.name = `Generated rectangle ${i + 1}`;
      figma.currentPage.appendChild(rect);
      nodes.push(rect);
    }

    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
    figma.closePlugin();
    return;
  }

  if (msg.type === 'run-mcp') {
    const endpoint = msg.endpoint.trim();
    if (!endpoint) {
      figma.notify('Please enter an MCP endpoint');
      figma.closePlugin();
      return;
    }

    try {
      const trimmedPayload = msg.payload.trim();
      let requestBody: string | undefined;
      let requestPayload: unknown = {};

      if (trimmedPayload) {
        try {
          requestPayload = JSON.parse(trimmedPayload);
          requestBody = JSON.stringify(requestPayload);
        } catch {
          requestPayload = trimmedPayload;
          requestBody = trimmedPayload;
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: requestBody
      });

      const responseText = await response.text();
      let parsedResponse: unknown = responseText;

      try {
        parsedResponse = JSON.parse(responseText);
      } catch {
        // Leave as raw text when the response is not JSON.
      }

      const responseValue = typeof parsedResponse === 'string'
        ? parsedResponse
        : JSON.stringify(parsedResponse, null, 2);

      const textNode = figma.createText();
      textNode.fontName = { family: 'Inter', style: 'Regular' };
      textNode.fontSize = 16;
      textNode.characters = responseValue;
      textNode.name = 'MCP response';
      figma.currentPage.appendChild(textNode);
      figma.currentPage.selection = [textNode];
      figma.viewport.scrollAndZoomIntoView([textNode]);
      figma.notify('MCP response added to the canvas');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      figma.notify(`MCP request failed: ${message}`);
    }

    figma.closePlugin();
    return;
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
