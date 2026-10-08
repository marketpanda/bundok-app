Climbing area shapes are grouped from simplified Philippine province boundaries
from James Faeldon's philippines-json-maps (2011, medium resolution):
https://github.com/faeldon/philippines-json-maps/tree/master/2011/geojson/provinces/medres

The source's MIT license is preserved in LICENSE.txt. Properties are reduced to
province names and the directory's climbing area IDs. These climbing areas group
provinces for mountain discovery; they do not represent current administrative
regions. Coordinates and coastlines are simplified for map display.

The blue Cordillera climbing area (including Nueva Vizcaya) uses the original,
unsimplified province geometry from the same source. Shared province edges are
removed so it renders as one continuous region with a detailed outer boundary.
Regenerate it with `node scripts/refine-cordillera-boundary.mjs`. The script uses
the Cordillera and Cagayan Valley files in the source repository:
https://github.com/faeldon/philippines-json-maps/tree/master/2011/geojson/provinces
