# Data sources and transformations

## World Bank — World Development Indicators

The game uses local snapshots of country-level indicators retrieved from the World Bank API on 2026-11-09 and 2026-11-10. The historical series covers 1960–2025 where observations are available. Public request URLs, file sizes and SHA-256 hashes are preserved in [SOURCES.json](data/SOURCES.json) and [SOURCES_HISTORY.json](data/SOURCES_HISTORY.json).

- Source: https://data.worldbank.org/ and https://api.worldbank.org/v2/
- Dataset terms: https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets

The game's derived runtime tables select observations, interpolate some gaps and apply documented fallback estimates. Country-level income is a coarse proxy in the simulation. Life events, individual risks and fictional outcomes are not official World Bank data or forecasts.

## Natural Earth

Map outlines are derived from Natural Earth's 1:110 million land data and simplified/projected for the game. Natural Earth describes its raster and vector map data as public domain.

- Source and terms: https://www.naturalearthdata.com/about/terms-of-use/
- Credit: Made with Natural Earth.

## Country and era configuration snapshots

Some education, employment, migration, military-service, economic-period and housing settings were normalized from a public frontend snapshot of [1in8b.life](https://1in8b.life/), collected on 2026-11-09. The input-table hashes, record references, conversion meanings and coverage are recorded in [PROFILE_PROVENANCE.json](data/PROFILE_PROVENANCE.json).

These are game-configuration snapshots, separate from the World Bank statistics. Not every country/year value has been independently checked against an official historical source. This export does not assign a new blanket license to that material.

The game uses its own event writing, artwork and interface. The repository provides the runtime snapshots required to build the existing game; it does not include the original site's frontend bundles or the local reverse-engineering workspace.
