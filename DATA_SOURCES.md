# Data sources and transformations

## World Bank — World Development Indicators

Local snapshots were retrieved from the official API on 2026-11-09, 2026-11-10, 2026-11-11 and 2026-11-12. Historical inputs cover 1960–2025 where values are available; the runtime roster has 192 countries and territories.

- Original country snapshots: [SOURCES.json](data/SOURCES.json).
- Original nine historical series: [SOURCES_HISTORY.json](data/SOURCES_HISTORY.json).
- Ten added living-condition series: [living/SOURCES.json](data/worldbank/living/SOURCES.json).
- Sex-specific life expectancy and fertility: [events/SOURCES.json](data/worldbank/events/SOURCES.json).
- Field definitions, coverage and transformations: [HISTORY_QUALITY.json](data/HISTORY_QUALITY.json) and [EVENT_HISTORY.json](data/reverse/EVENT_HISTORY.json).
- Official source: https://data.worldbank.org/ and https://api.worldbank.org/v2/
- Dataset terms: https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets

The 19-field historical framework includes life expectancy, infant and under-five mortality, current PPP GDP per capita, urbanization, electricity access, internet use, population, crude birth rate, secondary and tertiary gross enrollment, unemployment, agriculture/industry/services employment shares, out-of-pocket health expenditure, basic drinking water, constant-dollar GDP and constant-PPP GDP. It is not a complete observation in every country/year cell.

Source-published values are distinguished from this project's estimates; some underlying official series, including ILO modeled estimates, are themselves statistical models. Only bounded gaps between a country's reports are interpolated; carry-forward is limited to three years. Only infant/under-five mortality retains the same-year life-expectancy-neighbor estimate. Missing leading years stay missing. Population is stored in millions to six decimal places, preserving one-person precision. Internal parent-background years before 1960 are explicitly modeled, not official observations.

Gross enrollment can exceed 100% and is not an individual's admission probability. Unemployment and sector shares are national statistics, not a particular application's success rate. Out-of-pocket expenditure is the share of health spending, not every person's bill. These values inform declared game weights and cost models. Historical income uses same-country constant GDP growth ratios anchored to the current model; it is not a reconstructed observation of early current-price PPP income.

Raw population responses used by the regression are included. Other raw WDI responses can be fetched through the provided scripts; their exact snapshot hashes and request URLs remain recorded. Official responses can change after collection.

## BIS — selected residential property prices

The official bulk ZIP was downloaded on 2026-11-12. The generator selects Q4 real residential price indices (2010=100) and Q4 year-on-year real changes through 2025, matching 57 runtime locations, with 2,122 index records and 2,045 change records.

- [Download metadata and exact input hash](data/bis/SOURCES.json).
- [Country/year coverage and generated hash](data/bis/COVERAGE.json).
- Official data: https://data.bis.org/topics/RPP
- Metadata: https://www.bis.org/statistics/pp_selected_documentation.pdf

The game uses available annual changes for urban housing asset settlement, replacing its previous cycle contribution. Beginning-year purchase pressure uses the previous Q4 index and the modeled income relation; the current Q4 change enters at year-end. Rural and missing cases keep the source game's configuration. Nigeria is not covered by this input. Real residential prices are not rents, absolute house prices or a national observation of every household's housing burden. No missing years are interpolated or extended as future observations.

## Natural Earth

Map outlines derive from Natural Earth's 1:110 million land data, simplified and projected for the game. Natural Earth describes its raster and vector map data as public domain.

- Source and terms: https://www.naturalearthdata.com/about/terms-of-use/
- Credit: Made with Natural Earth.

## Imported game core and configuration

The synchronous simulation core, event code, Chinese text, registered decisions and continued state were imported from a public frontend snapshot of [1in8b.life](https://1in8b.life/) collected on 2026-11-09. This material includes 278 event entries, 188 registered decision classes and 91 named annual handlers. The game uses that core for 170 matching runtime locations, with the Nianlun model retained for 22 locations absent from the source configuration.

[EVENT_LIBRARY.json](data/reverse/EVENT_LIBRARY.json) records source bundle hashes, inventory and adapter edits. [PROVENANCE.json](data/reverse/PROVENANCE.json) and [country-profiles.json](data/reverse/country-profiles.json) preserve the earlier nine-table configuration derivation; [PROFILE_PROVENANCE.json](data/PROFILE_PROVENANCE.json) remains as the earlier public export record.

These game configurations are separate from official statistics. School systems, military service, historical settings and the complete imported writing have not all been independently checked against official historical sources. Local shared opportunities and continued effects are game design, not official individual causal estimates. The game keeps its own interface, tree-ring presentation, artwork, synthetic audio and additional writing, but does not claim that all event code or text is original.

The original frontend bundles, account integration, remote user-generated content and website UI are not included in this repository. The generated synchronous runtime is included for offline play and builds. Regeneration requires the exact separately supplied input snapshot. No new blanket license is assigned to imported material or to the repository; third-party material retains its own terms.
