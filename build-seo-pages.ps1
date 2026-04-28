$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

New-Item -ItemType Directory -Force -Path "serial", "brand", "category", "model", "replacement" | Out-Null
Get-ChildItem "serial" -Filter "*.html" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem "brand" -Filter "*.html" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem "category" -Filter "*.html" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem "replacement" -Filter "*.html" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem "model" -Recurse -Filter "*.html" -ErrorAction SilentlyContinue | Remove-Item -Force

function New-SerialPage {
  param(
    [string]$Brand,
    [string]$Slug,
    [string]$BrandSlug,
    [string]$CategorySlug,
    [string]$CategoryName,
    [string]$Focus,
    [string]$Locate,
    [string]$Notes,
    [string[]]$Related = @()
  )

  [pscustomobject][ordered]@{
    Brand = $Brand
    Slug = $Slug
    BrandSlug = $BrandSlug
    CategorySlug = $CategorySlug
    CategoryName = $CategoryName
    Focus = $Focus
    Locate = $Locate
    Notes = $Notes
    Related = $Related
  }
}

function New-ModelPage {
  param(
    [string]$Brand,
    [string]$BrandSlug,
    [string]$CategorySlug,
    [string]$CategoryName,
    [string]$SerialSlug,
    [string]$Model,
    [string]$ModelSlug,
    [string]$AgeRange,
    [string]$Overview,
    [string[]]$Specs,
    [string[]]$Comparables,
    [string[]]$DocumentationNotes,
    [string]$ReplacementSlug
  )

  [pscustomobject][ordered]@{
    Brand = $Brand
    BrandSlug = $BrandSlug
    CategorySlug = $CategorySlug
    CategoryName = $CategoryName
    SerialSlug = $SerialSlug
    Model = $Model
    ModelSlug = $ModelSlug
    AgeRange = $AgeRange
    Overview = $Overview
    Specs = $Specs
    Comparables = $Comparables
    DocumentationNotes = $DocumentationNotes
    ReplacementSlug = $ReplacementSlug
  }
}

$categoryMeta = @(
  [ordered]@{ Name = "Appliances"; Slug = "appliances"; Intro = "Use the appliances category hub to move from appliance identification into age verification and replacement research. The links on this page are organized around refrigerators, laundry, dishwashers, ranges, and other residential appliances that show up in claim files."; Details = "Start with the brand or serial page when you have a readable label. If you do not, document configuration, capacity, utility type, and finish tier first so the eventual age note and LKQ replacement path stay grounded in field evidence." },
  [ordered]@{ Name = "HVAC"; Slug = "hvac"; Intro = "Use the HVAC category hub to verify equipment age, keep field documentation consistent, and compare replacements using tonnage, fuel, controls, and system-type requirements rather than generic brand assumptions."; Details = "A usable HVAC claim file should include the full data plate, component type, tonnage, fuel, efficiency band, and install constraints. These links are grouped to help you move from serial lookup into documentation and replacement screening quickly." },
  [ordered]@{ Name = "Electronics"; Slug = "electronics"; Intro = "Use the electronics category hub when the file requires item identification, production-range confirmation, and replacement review for TVs, monitors, laptops, tablets, or related consumer electronics."; Details = "For electronics, age alone rarely resolves LKQ. Record screen size, trim level, storage, connectivity features, and exact model suffixes so the replacement review stays tied to the original item." },
  [ordered]@{ Name = "Water Heaters"; Slug = "water-heaters"; Intro = "Use the water-heater category hub to document age, tank size, fuel type, and configuration before moving into replacement scope. Water-heater files break down quickly when those core specifications are missing."; Details = "Record whether the unit is tank, tankless, or heat pump; note fuel, venting, capacity, and install constraints; then use the related brand and serial pages to support the age call and replacement path." }
)

$serialPages = @(
  (New-SerialPage "GE" "ge-serial-number-lookup" "ge" "appliances" "Appliances" "GE appliance age verification for refrigerators, dishwashers, ranges, laundry, and claim support." "Most GE labels are on the refrigerator liner, dishwasher tub lip, washer lid opening, or oven frame. Photograph the full data plate so model, serial, and series information stay together." "GE serial formats commonly rely on letter-based month and year codes that can repeat by decade, so the code should be interpreted with model family and physical age clues." @("whirlpool-serial-number-lookup","frigidaire-serial-number-lookup","lg-appliances-serial-number-lookup")),
  (New-SerialPage "Whirlpool" "whirlpool-serial-number-lookup" "whirlpool" "appliances" "Appliances" "Whirlpool appliance age verification and serial support for claim files." "Whirlpool labels are usually inside the refrigerator compartment, on the dishwasher frame, under the washer lid, or behind the dryer door opening. Capture the entire manufacturer tag, not just the serial field." "Whirlpool-owned brands share platform logic, but line-specific differences still matter when you write the final age note or compare LKQ replacements." @("maytag-serial-number-lookup","kitchenaid-serial-number-lookup","amana-serial-number-lookup")),
  (New-SerialPage "Rheem" "rheem-serial-number-lookup" "rheem" "hvac" "HVAC" "Rheem HVAC and water-heater age verification for field documentation." "Rheem data plates are commonly on the condenser cabinet sidewall, the air-handler access panel, or the water-heater rating plate. Capture the full plate with model, serial, and utility details together." "Rheem serial formats often encode production timing, but the exact read depends on equipment family and should be tied back to the full model plate before it is treated as final." @("rheem-hvac-serial-number-lookup","rheem-water-heater-serial-number-lookup","carrier-serial-number-lookup")),
  (New-SerialPage "Carrier" "carrier-serial-number-lookup" "carrier" "hvac" "HVAC" "Carrier HVAC age verification and claim workflow support." "Carrier labels are usually on the outdoor condenser cabinet, furnace burner compartment, or air-handler panel. Photograph the full plate so serial, model, voltage, and tonnage clues remain connected." "Carrier serial logic varies by era and product family, so the code should be interpreted with system type, design generation, and the full data plate in view." @("carrier-hvac-serial-number-lookup","bryant-serial-number-lookup","trane-serial-number-lookup")),
  (New-SerialPage "Goodman" "goodman-serial-number-lookup" "goodman" "hvac" "HVAC" "Goodman HVAC serial lookup for age calls, depreciation notes, and LKQ review." "Goodman labels are typically mounted on the condenser cabinet, furnace vestibule panel, or air-handler casing. Save a clear image of the full plate so serial, model, and electrical data stay together." "Goodman serials often include production-date indicators, but the result should still be tied back to the original manufacturer plate and exact equipment family." @("lennox-serial-number-lookup","york-serial-number-lookup","daikin-serial-number-lookup")),
  (New-SerialPage "Trane" "trane-serial-number-lookup" "trane" "hvac" "HVAC" "Trane HVAC serial lookup for production-range verification and replacement screening." "Trane labels are commonly found on the outdoor condensing unit, furnace data plate, or indoor air-handler cabinet. Capture the full label so serial, model, and electrical details are documented in one image." "Trane serial numbers use brand-specific date logic that can differ by era. Even when the code seems straightforward, the result should be checked against system type and complete model information." @("trane-hvac-serial-number-lookup","american-standard-serial-number-lookup","carrier-serial-number-lookup")),
  (New-SerialPage "LG" "lg-serial-number-lookup" "lg" "electronics" "Electronics" "LG electronics and appliance serial lookup support for claims." "LG serial labels are commonly inside refrigerator walls, washer door openings, dryer openings, or on the rear panel of electronics. Save the entire label so model suffixes and region details are not lost." "LG serial numbers often include month-year production clues, but appliances and electronics should not be treated as one decoder system because model-family differences affect the final read." @("lg-appliances-serial-number-lookup","samsung-serial-number-lookup","bosch-serial-number-lookup")),
  (New-SerialPage "Samsung" "samsung-serial-number-lookup" "samsung" "electronics" "Electronics" "Samsung serial lookup support for TVs, appliances, and claim-ready documentation." "Samsung labels are often inside refrigerator walls, on washer or dryer door frames, or on the rear of TVs and monitors. Photograph the full plate because suffixes and region identifiers matter in later replacement research." "Samsung serial timing can vary by product family. TVs, ranges, refrigerators, and laundry products should not be treated as a single decoder set, and the model number is usually needed to confirm the right line." @("samsung-hvac-serial-number-lookup","lg-serial-number-lookup","kenmore-serial-number-lookup")),
  (New-SerialPage "Kenmore" "kenmore-serial-number-lookup" "kenmore" "appliances" "Appliances" "Kenmore appliance serial lookup for sourced-manufacturer age verification." "Kenmore labels are usually inside refrigerator compartments, on laundry door openings, or on appliance frame tags. Photograph the full data plate so any source-manufacturer clues remain visible." "Kenmore serial numbers often require source-brand context because the product may have been built by Whirlpool, LG, Frigidaire, or another OEM. That manufacturer context should be documented before the final age call is written." @("kenmore-elite-serial-number-lookup","whirlpool-serial-number-lookup","frigidaire-serial-number-lookup")),
  (New-SerialPage "Frigidaire" "frigidaire-serial-number-lookup" "frigidaire" "appliances" "Appliances" "Frigidaire appliance age verification for residential claims." "Frigidaire labels are commonly found inside refrigerator walls, on dishwasher tub openings, and on laundry door or lid frames. Capture the full plate before isolating the serial number." "Frigidaire serial formats can be straightforward, but date logic still needs to be checked against model family and physical condition before the production range is treated as final." @("frigidaire-gallery-serial-number-lookup","ge-serial-number-lookup","kenmore-serial-number-lookup")),
  (New-SerialPage "Maytag" "maytag-serial-number-lookup" "maytag" "appliances" "Appliances" "Maytag appliance serial lookup for claim-ready age verification." "Maytag labels are usually inside appliance openings or behind access points near the data plate. Photograph the full label so model family and capacity details stay attached to the serial." "Maytag often shares platform logic with other Whirlpool-owned brands, but line-specific product details still matter when you narrow the production range or compare replacements." @("maytag-laundry-serial-number-lookup","whirlpool-serial-number-lookup","amana-serial-number-lookup")),
  (New-SerialPage "Bosch" "bosch-serial-number-lookup" "bosch" "appliances" "Appliances" "Bosch appliance serial lookup for premium appliance claims and replacement research." "Bosch labels are often inside dishwasher tub openings, refrigerator liners, or cooking-equipment door frames. Capture the complete plate because regional and product-family details affect later research." "Bosch serial formats can vary by imported line and product family, so the serial should be read together with the model family and configuration before the final age note is set." @("bosch-dishwasher-serial-number-lookup","kitchenaid-serial-number-lookup","lg-appliances-serial-number-lookup")),
  (New-SerialPage "Amana" "amana-serial-number-lookup" "amana" "appliances" "Appliances" "Amana appliance serial lookup for production-range verification and replacement notes." "Amana labels are typically inside refrigerator compartments, on range frames, or on washer and dryer openings. Photograph the full manufacturer tag for model and serial context." "Amana often shares platform logic with Whirlpool-owned product families, so product type and model details should stay attached to any age conclusion." @("whirlpool-serial-number-lookup","maytag-serial-number-lookup","kitchenaid-serial-number-lookup")),
  (New-SerialPage "Lennox" "lennox-serial-number-lookup" "lennox" "hvac" "HVAC" "Lennox HVAC serial lookup for equipment age verification and scope support." "Lennox labels are usually on outdoor cabinets, furnace burner compartments, or air-handler panels. Save a full data-plate photo so serial, model, and tonnage information stay together." "Lennox serial formats can vary by equipment family and era. The result should be checked against system type, refrigerant generation, and the full model plate before the production range is finalized." @("york-serial-number-lookup","daikin-serial-number-lookup","goodman-serial-number-lookup")),
  (New-SerialPage "York" "york-serial-number-lookup" "york" "hvac" "HVAC" "York HVAC serial lookup for age verification and LKQ screening." "York labels are commonly on condenser side panels, furnace compartments, or air-handler cabinets. Photograph the full tag before isolating any single field." "York serial logic is brand-specific and should be read with model, tonnage, fuel, and system type before the production range is used in a claim note." @("lennox-serial-number-lookup","carrier-serial-number-lookup","trane-serial-number-lookup")),
  (New-SerialPage "Daikin" "daikin-serial-number-lookup" "daikin" "hvac" "HVAC" "Daikin HVAC serial lookup for mini-split and whole-home equipment claims." "Daikin labels are often on outdoor units, indoor heads, air handlers, or furnaces. Capture the full plate so model family, electrical details, and serial stay connected." "Daikin equipment spans mini-splits, ducted systems, and packaged units, so the serial should always be interpreted with the correct equipment family in mind." @("daikin-mini-split-serial-number-lookup","lennox-serial-number-lookup","goodman-serial-number-lookup")),
  (New-SerialPage "Bryant" "bryant-serial-number-lookup" "bryant" "hvac" "HVAC" "Bryant HVAC serial lookup for age verification, system documentation, and claim handling." "Bryant labels are usually on outdoor condensers, furnace data plates, or air-handler cabinets. Photograph the full tag so serial, model, and electrical details remain in one record." "Bryant shares platform relationships with Carrier, but system family and exact model details still matter before you finalize the age note or compare replacements." @("carrier-serial-number-lookup","carrier-hvac-serial-number-lookup","american-standard-serial-number-lookup")),
  (New-SerialPage "American Standard" "american-standard-serial-number-lookup" "american-standard" "hvac" "HVAC" "American Standard HVAC serial lookup for production-range verification and replacement support." "American Standard labels are commonly on condensers, furnaces, and air-handler cabinets. Capture the full plate so serial, model, and system details remain together." "American Standard often tracks closely with Trane product logic, but the exact equipment family should still be documented before the age note is carried into the claim file." @("trane-serial-number-lookup","trane-hvac-serial-number-lookup","carrier-serial-number-lookup")),
  (New-SerialPage "KitchenAid" "kitchenaid-serial-number-lookup" "kitchenaid" "appliances" "Appliances" "KitchenAid appliance serial lookup for premium kitchen equipment claims." "KitchenAid labels are usually inside refrigerators, dishwashers, ranges, and wall-oven frames. Photograph the full tag so configuration and product-family details stay with the serial." "KitchenAid often shares platform logic with Whirlpool-owned lines, but premium trim and configuration differences still matter when age and LKQ quality are documented." @("whirlpool-serial-number-lookup","bosch-serial-number-lookup","ge-serial-number-lookup")),
  (New-SerialPage "Samsung HVAC" "samsung-hvac-serial-number-lookup" "samsung-hvac" "hvac" "HVAC" "Samsung HVAC serial lookup for ductless and HVAC product documentation." "Samsung HVAC labels are usually on outdoor condensing units, indoor ductless heads, or air-handler panels. Capture the full plate so serial, model, and electrical details remain connected." "Samsung HVAC should be treated separately from Samsung appliance and TV serial logic. Product family and system type should stay attached to the final age conclusion." @("daikin-mini-split-serial-number-lookup","carrier-hvac-serial-number-lookup","trane-hvac-serial-number-lookup")),
  (New-SerialPage "LG Appliances" "lg-appliances-serial-number-lookup" "lg-appliances" "appliances" "Appliances" "LG appliance serial lookup for refrigerators, laundry, and kitchen claim workflows." "LG appliance labels are commonly inside refrigerator walls, on laundry door frames, or on cooking-equipment model tags. Save the entire plate so suffixes and configuration details are not lost." "LG appliance serial logic should be interpreted with the exact appliance family and model suffix because trim level and configuration can affect both age confirmation and LKQ replacement matching." @("lg-serial-number-lookup","samsung-serial-number-lookup","bosch-serial-number-lookup")),
  (New-SerialPage "GE Appliances" "ge-appliances-serial-number-lookup" "ge" "appliances" "Appliances" "GE Appliances serial lookup for kitchen and laundry claim documentation." "Most GE Appliances labels are on the refrigerator liner, dishwasher tub lip, washer lid opening, or oven frame. Photograph the full tag so serial and model-family details stay together." "This page narrows the workflow to GE Appliances lines used in residential kitchens and laundry rooms, which helps when the generic GE brand result needs an appliance-specific age note." @("ge-serial-number-lookup","whirlpool-appliances-serial-number-lookup","frigidaire-gallery-serial-number-lookup")),
  (New-SerialPage "Whirlpool Appliances" "whirlpool-appliances-serial-number-lookup" "whirlpool" "appliances" "Appliances" "Whirlpool appliance serial lookup for laundry and kitchen loss files." "Whirlpool appliance labels are usually inside compartments or on frame tags near the loading or access opening. Capture the full manufacturer plate instead of only the serial field." "This page narrows the workflow to Whirlpool-branded appliances so the age call can be paired with configuration and capacity details more quickly." @("whirlpool-serial-number-lookup","maytag-serial-number-lookup","amana-serial-number-lookup")),
  (New-SerialPage "Rheem Water Heaters" "rheem-water-heater-serial-number-lookup" "rheem" "water-heaters" "Water Heaters" "Rheem water-heater serial lookup for tank, tankless, and hybrid water-heater claims." "Rheem water-heater labels are usually on the front or side jacket panel. Photograph the entire rating plate so serial, gallon size, fuel type, and venting data remain connected." "Water-heater serial interpretation should be tied to tank size, fuel, and venting requirements before the production range is carried into replacement scope." @("rheem-serial-number-lookup","rheem-hvac-serial-number-lookup","ge-serial-number-lookup")),
  (New-SerialPage "Rheem HVAC" "rheem-hvac-serial-number-lookup" "rheem" "hvac" "HVAC" "Rheem HVAC serial lookup for condensers, furnaces, and air handlers." "Rheem HVAC labels are usually on the condenser side panel, furnace compartment, or air-handler cabinet. Save the full plate so tonnage and fuel details stay with the serial." "This page narrows the workflow to Rheem HVAC equipment so the age note can be paired with tonnage, system type, and efficiency context immediately." @("rheem-serial-number-lookup","carrier-serial-number-lookup","trane-serial-number-lookup")),
  (New-SerialPage "Carrier HVAC" "carrier-hvac-serial-number-lookup" "carrier" "hvac" "HVAC" "Carrier HVAC serial lookup for system-age verification and field documentation." "Carrier HVAC labels are usually on condensers, furnaces, and air handlers. Photograph the full tag so serial, model, tonnage, and electrical details stay together." "This page narrows the workflow to Carrier HVAC equipment so the age note can be paired with system-specific replacement factors immediately." @("carrier-serial-number-lookup","bryant-serial-number-lookup","american-standard-serial-number-lookup")),
  (New-SerialPage "Trane HVAC" "trane-hvac-serial-number-lookup" "trane" "hvac" "HVAC" "Trane HVAC serial lookup for age verification and full system documentation." "Trane HVAC labels are commonly on the outdoor cabinet, furnace data plate, or air-handler panel. Photograph the full label so serial, model, and system details remain in one record." "This page narrows the workflow to Trane HVAC equipment and keeps the age call tied to tonnage, controls, and install context." @("trane-serial-number-lookup","american-standard-serial-number-lookup","carrier-serial-number-lookup")),
  (New-SerialPage "Bosch Dishwashers" "bosch-dishwasher-serial-number-lookup" "bosch" "appliances" "Appliances" "Bosch dishwasher serial lookup for premium dishwasher age verification and replacement notes." "Bosch dishwasher labels are usually on the tub opening, side frame, or inner door area. Photograph the complete tag so model family and finish details stay with the serial." "Dishwasher replacement quality depends on configuration, tub layout, drying method, and feature tier, so the Bosch serial note should not stand alone." @("bosch-serial-number-lookup","kitchenaid-serial-number-lookup","ge-serial-number-lookup")),
  (New-SerialPage "Kenmore Elite" "kenmore-elite-serial-number-lookup" "kenmore" "appliances" "Appliances" "Kenmore Elite serial lookup for higher-tier residential appliance claims." "Kenmore Elite labels are usually in the same locations as standard Kenmore products, but the full data plate is even more important because the source manufacturer and trim tier affect replacement matching." "Kenmore Elite products can be sourced from different manufacturers, so the claim note should preserve source-brand clues before the age range is finalized." @("kenmore-serial-number-lookup","lg-appliances-serial-number-lookup","whirlpool-serial-number-lookup")),
  (New-SerialPage "Frigidaire Gallery" "frigidaire-gallery-serial-number-lookup" "frigidaire" "appliances" "Appliances" "Frigidaire Gallery serial lookup for higher-feature appliance claim files." "Frigidaire Gallery labels are commonly inside refrigerator walls, range frames, or dishwasher tub openings. Capture the full plate so feature-tier clues remain visible." "This page narrows the workflow to a premium Frigidaire line where finish, configuration, and trim level matter alongside the age call." @("frigidaire-serial-number-lookup","bosch-serial-number-lookup","ge-appliances-serial-number-lookup")),
  (New-SerialPage "Maytag Laundry" "maytag-laundry-serial-number-lookup" "maytag" "appliances" "Appliances" "Maytag laundry serial lookup for washer and dryer claim workflows." "Maytag laundry labels are typically on the door frame, lid opening, or rear service area. Photograph the full tag so load type, capacity, and model family stay attached to the serial." "Laundry LKQ depends heavily on load type, capacity, and feature tier, so the age note should be documented together with those details." @("maytag-serial-number-lookup","whirlpool-appliances-serial-number-lookup","lg-appliances-serial-number-lookup")),
  (New-SerialPage "Daikin Mini Splits" "daikin-mini-split-serial-number-lookup" "daikin" "hvac" "HVAC" "Daikin mini-split serial lookup for ductless system claim handling." "Daikin mini-split labels are usually on the outdoor unit and on each indoor head. Capture both plates when possible so system pairing and size details remain visible." "Mini-split age verification should preserve system pairing, zone count, and capacity details because replacement scope can change significantly when those details are missing." @("daikin-serial-number-lookup","samsung-hvac-serial-number-lookup","lennox-serial-number-lookup"))
)

$modelPages = @(
  (New-ModelPage "GE" "ge" "appliances" "Appliances" "ge-serial-number-lookup" "GDT630PYRFS" "gdt630pyrfs" "Commonly documented as an early-2020s dishwasher model line." "The GE GDT630PYRFS is a full-size built-in dishwasher line that commonly appears in residential kitchen losses. It is typically documented as a stainless-finish mid-grade platform where tub layout, drying method, and control placement matter during LKQ review." @("Full-size built-in dishwasher platform","Stainless exterior trim","Hidden or semi-hidden top controls depending on trim","Standard 24-inch installation footprint","Comparable mid-grade wash and dry feature tier") @("GE GDPH4515AF","Bosch SHE3AEM5N","Whirlpool WDT730HAMZ") @("Document whether the original unit used a front control or top-control layout.","Capture finish, handle style, and visible panel requirements if matching the kitchen suite matters.","Confirm whether hardwiring or cord connection details affect installation scope.") "gdt630pyrfs"),
  (New-ModelPage "Whirlpool" "whirlpool" "appliances" "Appliances" "whirlpool-serial-number-lookup" "WRF535SWHZ" "wrf535swhz" "Commonly documented as a late-2010s to early-2020s refrigerator line." "The Whirlpool WRF535SWHZ is a French-door refrigerator line that commonly appears in kitchen replacement files. Replacement screening usually depends on configuration, total capacity class, ice-maker layout, and finish compatibility." @("French-door refrigerator configuration","Mid-capacity residential platform","Bottom freezer layout","Common stainless finish expectations","Typical in-door or internal ice-maker comparison point") @("Whirlpool WRFF3436RZ","GE GNE27JYMFS","Frigidaire GRFS2853AF") @("Document the door configuration and whether the original had exterior water or ice access.","Note approximate capacity class even if cubic footage is not printed on the label.","Preserve finished-panel or suite-matching requirements if they affect settlement scope.") "wrf535swhz"),
  (New-ModelPage "Rheem" "rheem" "water-heaters" "Water Heaters" "rheem-water-heater-serial-number-lookup" "PROG50-38N RH60" "prog50-38n-rh60" "Often documented as a conventional residential gas water-heater line from an earlier production cycle." "The Rheem PROG50-38N RH60 is a 50-gallon class residential gas water heater frequently referenced in property-loss files. Replacement review depends on tank capacity, fuel type, venting, and recovery expectations rather than age alone." @("Approximately 50-gallon tank class","Natural gas residential configuration","Atmospheric vent style or comparable venting context","Standard residential utility closet footprint","Conventional tank platform rather than hybrid or tankless") @("Rheem PROG50S-40N","A.O. Smith GCRL-50","Bradford White RG250T6N") @("Document venting path, closet clearance limits, and gas connection context.","Capture tank capacity and fuel type directly from the plate.","Note whether code upgrades or seismic bracing affect the replacement scope.") "prog50-38n-rh60"),
  (New-ModelPage "Carrier" "carrier" "hvac" "HVAC" "carrier-hvac-serial-number-lookup" "24ACC636A003" "24acc636a003" "Commonly documented as a residential condenser line from the 2010s." "The Carrier 24ACC636A003 is a residential outdoor condenser model that appears in HVAC replacement files where tonnage, refrigerant context, and efficiency band drive the LKQ decision. A matching replacement should be screened on system type and install constraints before brand preference." @("Approximately 3-ton condenser class","Split-system air conditioner configuration","Outdoor condensing unit","Residential efficiency tier comparison point","System match depends on indoor coil and refrigerant compatibility") @("Carrier 24SCA436A003","Bryant 114SAN036","Trane 4TTR4036") @("Capture tonnage and the matched indoor equipment if visible on site.","Note refrigerant generation and whether line-set or coil compatibility may affect scope.","Record pad, disconnect, and electrical details if they influence replacement pricing.") "24acc636a003"),
  (New-ModelPage "Goodman" "goodman" "hvac" "HVAC" "goodman-serial-number-lookup" "GSX140361" "gsx140361" "Usually documented as a residential 3-ton condenser platform from the 2010s or later." "The Goodman GSX140361 is a common residential condenser line used in split-system cooling applications. Replacement review should focus on tonnage, efficiency class, system match, and installation fit rather than cabinet appearance alone." @("Approximately 3-ton condenser class","Residential split-system cooling","Outdoor condensing unit","Entry to mid-tier efficiency comparison point","Requires matched indoor equipment review") @("Goodman GLXS4BA3610","Amana ASXH403610","Carrier 24SCA436A003") @("Document tonnage and matched indoor component if visible.","Record disconnect, pad, whip, and refrigerant context for pricing support.","Note whether a heat-pump versus straight-cool distinction changes the scope.") "gsx140361"),
  (New-ModelPage "Trane" "trane" "hvac" "HVAC" "trane-hvac-serial-number-lookup" "4TTR6036N1000A" "4ttr6036n1000a" "Typically documented as a residential condenser model from a modern Trane generation." "The Trane 4TTR6036N1000A is a residential outdoor condenser model where tonnage, matched-system details, and efficiency band shape the replacement path. Claims should preserve both the serial evidence and the surrounding installation context." @("Approximately 3-ton condenser class","Residential split-system cooling","Outdoor condensing unit","Modern Trane efficiency tier","Matched indoor system review required") @("Trane 4TTR4036","American Standard 4A7A4036N","Carrier 24SCA436A003") @("Capture system tonnage and any communicating or variable-speed details.","Document refrigerant generation and matched indoor coil if visible.","Keep pad, whip, disconnect, and line-set context in the scope note.") "4ttr6036n1000a"),
  (New-ModelPage "LG" "lg-appliances" "appliances" "Appliances" "lg-appliances-serial-number-lookup" "WM4000HWA" "wm4000hwa" "Commonly documented as a modern front-load washer line." "The LG WM4000HWA is a front-load washer model line that often appears in residential claim files where load type, capacity, and smart-feature tier matter during LKQ review. Matching should stay focused on utility and configuration, not only brand." @("Front-load washer platform","High-capacity residential laundry class","Stackable laundry configuration context","Modern digital control layout","Mid to upper-mid feature tier") @("LG WM5500HWA","Samsung WF45T6000AW","Whirlpool WFW5605MW") @("Document front-load configuration and approximate capacity tier.","Note whether pedestal, stacking, or sidekick accessories were part of the loss.","Preserve any finish or paired-dryer expectations that matter to the insured set.") "wm4000hwa"),
  (New-ModelPage "Samsung" "samsung" "appliances" "Appliances" "samsung-serial-number-lookup" "NSG6DG8700SR" "nsg6dg8700sr" "Documented as a modern residential range line from a current product generation." "The Samsung NSG6DG8700SR is a residential range line where utility type, width, burner configuration, and feature tier drive the replacement path. This type of item should be documented with both model data and installation context before an LKQ match is selected." @("Residential full-size range platform","Standard kitchen width class","Modern digital control and cooking-feature tier","Kitchen suite finish considerations","Fuel or power source must be confirmed on site") @("Samsung NSG6DG8500SR","GE JGS760SPSS","Whirlpool WFG550S0LZ") @("Confirm whether the original was gas or electric before comparing replacements.","Document width, finish, and whether smart or air-fry features materially affect quality tier.","Capture anti-tip, gas connection, or outlet context if it affects replacement scope.") "nsg6dg8700sr"),
  (New-ModelPage "Bosch" "bosch" "appliances" "Appliances" "bosch-dishwasher-serial-number-lookup" "SHEM63W55N" "shem63w55n" "Often documented as a premium residential dishwasher line from an earlier Bosch generation." "The Bosch SHEM63W55N is a residential dishwasher line where sound rating, rack layout, and drying method matter more than age alone during LKQ review. The claim note should keep those performance factors tied to the model identification." @("24-inch built-in dishwasher platform","Bosch premium tub and rack layout context","Quiet-operation expectation","European-style drying and cycle profile context","Integrated residential installation footprint") @("Bosch SHE3AEM5N","KitchenAid KDFE204KPS","GE GDP665SYNFS") @("Document whether the insured kitchen requires a visible-handle or hidden-control layout.","Preserve finish expectations and any panel-match requirements.","Note hardwire, drain, and water-supply access if the installation affects pricing.") "shem63w55n"),
  (New-ModelPage "Kenmore" "kenmore" "appliances" "Appliances" "kenmore-serial-number-lookup" "79574025411" "79574025411" "Often documented as a refrigerator line sourced from an OEM partner during the 2010s." "The Kenmore 79574025411 is a refrigerator model where source-manufacturer context, configuration, and capacity class all affect the claim file. Because Kenmore can be OEM-sourced, the replacement path should be anchored to features and layout rather than brand alone." @("Residential refrigerator platform","Likely French-door or comparable configuration class","OEM-sourced Kenmore context","Capacity and finish class should be documented","Kitchen suite compatibility may matter") @("LG LRFLC2706S","Whirlpool WRFF3436RZ","Frigidaire GRFS2853AF") @("Capture the full Kenmore data plate so source-manufacturer clues remain visible.","Note configuration, finish, and whether exterior water or ice service matters.","Keep approximate capacity class in the file if it affects the replacement path.") "79574025411"),
  (New-ModelPage "Maytag" "maytag" "appliances" "Appliances" "maytag-laundry-serial-number-lookup" "MED7230HW" "med7230hw" "Commonly documented as a modern electric dryer line." "The Maytag MED7230HW is a residential dryer model line where fuel type, capacity, and feature tier are central to LKQ. The claim file should preserve the original utility type and control tier before a replacement recommendation is made." @("Residential dryer platform","Electric dryer utility type","Modern digital control tier","Large-capacity laundry class","Paired-set considerations may affect scope") @("Maytag MED4500MW","Whirlpool WED5605MW","LG DLE7400WE") @("Confirm electric versus gas before comparing replacements.","Document whether the dryer was part of a matched laundry pair.","Note venting path, pedestal, and finish expectations if they affect scope.") "med7230hw"),
  (New-ModelPage "Frigidaire" "frigidaire" "appliances" "Appliances" "frigidaire-gallery-serial-number-lookup" "GRFS2853AF" "grfs2853af" "Commonly documented as a modern French-door refrigerator line." "The Frigidaire GRFS2853AF is a French-door refrigerator model line where configuration, capacity tier, and suite compatibility shape LKQ. The claim note should connect those fields to the production range and finish expectations." @("French-door refrigerator platform","Modern kitchen-suite finish context","Large-capacity residential class","Bottom-freezer configuration","Interior and dispenser layout should be compared") @("Frigidaire PRFG2383AF","Whirlpool WRFF3436RZ","GE GNE27JYMFS") @("Capture door configuration and any dispenser requirements.","Record finish expectations and approximate capacity class.","Note whether counter-depth or standard-depth fit affects replacement scope.") "grfs2853af"),
  (New-ModelPage "Daikin" "daikin" "hvac" "HVAC" "daikin-mini-split-serial-number-lookup" "RXB24AXVJU" "rxb24axvju" "Often documented as a residential mini-split outdoor unit from a modern Daikin line." "The Daikin RXB24AXVJU is a ductless outdoor unit where system pairing, zone count, and capacity class drive replacement scope. Mini-split claims should preserve both outdoor and indoor model evidence before an LKQ recommendation is written." @("Ductless outdoor unit platform","Mini-split system context","Approximately 24k BTU class","Matched indoor head compatibility required","Residential inverter-driven equipment tier") @("Daikin RX24AXVJU","Mitsubishi MXZ-series 24k class","Samsung ductless 24k class") @("Capture both outdoor and indoor model plates whenever possible.","Document zone count and indoor-head pairing to avoid weak replacement matches.","Note line-set length, electrical path, and mounting details if they affect pricing.") "rxb24axvju"),
  (New-ModelPage "Lennox" "lennox" "hvac" "HVAC" "lennox-serial-number-lookup" "ML17XC1-036" "ml17xc1-036" "Documented as a modern residential condenser line in the 3-ton class." "The Lennox ML17XC1-036 is a residential outdoor condenser model where tonnage, efficiency tier, and matched-system context drive the replacement decision. The serial note should be kept with system details and install conditions." @("Approximately 3-ton condenser class","Residential split-system cooling","Outdoor condensing unit","Modern Lennox efficiency tier","Matched indoor equipment review required") @("Lennox ML14XC1-036","Carrier 24SCA436A003","Trane 4TTR4036") @("Capture tonnage and the matched indoor component if visible.","Record refrigerant generation and any communicating-control context.","Preserve pad, disconnect, and line-set notes if they affect scope.") "ml17xc1-036")
)

$brandGroups = $serialPages | Group-Object BrandSlug

function Get-PageHead($title, $description, $canonical) {
@"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$title</title>
  <meta name="description" content="$description">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="https://www.boltresearchteam.com$canonical">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon-bolt.svg?v=1">
  <link rel="stylesheet" href="/assets/seo.css">
</head>
<body>
<div class="seo-shell">
"@
}

function Get-HeaderMarkup {
@"
  <header class="seo-header">
    <div class="seo-topbar">
      <a class="seo-logo" href="/">Bolt <span>Research Team</span></a>
      <nav class="seo-nav" aria-label="Primary">
        <a href="/category/appliances">Appliance Age Verification</a>
        <a href="/category/hvac">HVAC Serial Number Decoder</a>
        <a href="/category/electronics">Electronics Research</a>
        <a href="/category/water-heaters">Water Heater Claims</a>
      </nav>
    </div>
  </header>
"@
}

function Get-FooterMarkup {
@"
  <footer class="seo-footer">
    <div>Built for insurance adjusters, inspectors, and claims professionals who need defensible equipment age and replacement research.</div>
    <div class="seo-footer-links">
      <a href="/">Homepage</a>
      <a href="/brand/ge">Brand Pages</a>
      <a href="/serial/ge-serial-number-lookup">Serial Lookup</a>
      <a href="/item-age">Open Live Decoder</a>
    </div>
  </footer>
</div>
</body>
</html>
"@
}

function Get-SerialFaq($page) {
  @(
    [ordered]@{ Q = "Where is the serial number located?"; A = $page.Locate },
    [ordered]@{ Q = "Can I determine age from serial number alone?"; A = "Sometimes. Some manufacturer formats allow an exact production year or week, while others only support a probable range that still needs model-family and field-context confirmation." },
    [ordered]@{ Q = "What if the serial number is missing?"; A = "Document the missing or damaged label, preserve any visible fragments, and use model data, configuration, install context, and surrounding photos to support an estimated age note." },
    [ordered]@{ Q = "What if the model is discontinued?"; A = "A discontinued model does not prevent age or replacement research. Document the serial result, then move into model and replacement review using configuration, capacity, utility type, and feature tier." },
    [ordered]@{ Q = "How accurate is the estimate?"; A = "Accuracy depends on the brand format and the quality of the original label. If the serial pattern repeats by decade or product family, the final conclusion should be documented as an estimate rather than a confirmed date." },
    [ordered]@{ Q = "What matters for LKQ replacement?"; A = "Match category, installation type, capacity or tonnage, utility source, and feature tier before treating a replacement as comparable." }
  )
}

function Get-BrandDescription($group) {
  $first = $group.Group[0]
  "Use Bolt's $($first.Brand) brand page to move from serial number verification into age documentation, model identification, and LKQ replacement research for insurance claims."
}

function Get-CategoryName($slug) {
  ($categoryMeta | Where-Object { $_.Slug -eq $slug }).Name
}

function Get-FeatureTier($specs, $overview) {
  $joined = (($specs -join " ") + " " + $overview).ToLower()
  if ($joined -match "premium|upper|quiet|inverter|high-feature|designer") { return "Premium" }
  if ($joined -match "entry") { return "Entry" }
  if ($joined -match "mid") { return "Mid-Grade" }
  return "Mid-Grade"
}

function Get-UtilityType($specs, $overview) {
  $joined = (($specs -join " ") + " " + $overview).ToLower()
  if ($joined -match "natural gas|gas water|gas ") { return "Gas" }
  if ($joined -match "electric ") { return "Electric" }
  if ($joined -match "split-system|condenser|mini-split|air conditioner|hvac") { return "HVAC system power should be confirmed from the data plate" }
  return "Utility type should be confirmed from the data plate"
}

function Get-InstallationType($specs, $overview) {
  $joined = (($specs -join " ") + " " + $overview).ToLower()
  if ($joined -match "built-in") { return "Built-in" }
  if ($joined -match "freestanding") { return "Freestanding" }
  if ($joined -match "front-load") { return "Front-load laundry installation" }
  if ($joined -match "condenser|outdoor condensing unit") { return "Outdoor condensing unit in a split system" }
  if ($joined -match "mini-split|ductless") { return "Ductless split-system installation" }
  if ($joined -match "tank ") { return "Residential tank installation" }
  return "Installation type should be confirmed on site"
}

function Get-SizeClass($specs) {
  if ($specs.Count -gt 0) { return $specs[0] }
  return "Size class should be confirmed from the manufacturer label"
}

function Get-ClaimScenarioMarkup($categoryName) {
  switch ($categoryName) {
    "HVAC" {
      return @(
        "<li><strong>Water damage:</strong> Document whether the loss affected the outdoor unit, air handler, controls, or surrounding electrical path before deciding if partial versus full replacement is appropriate.</li>",
        "<li><strong>Electrical failure:</strong> Preserve breaker, disconnect, and control-board findings because electrical surge claims often involve both the condenser and the indoor matched component.</li>",
        "<li><strong>Age-related failure:</strong> Keep the production range tied to refrigerant generation, efficiency band, and matched-system context so the age note actually supports the replacement path.</li>",
        "<li><strong>Partial label missing:</strong> Photograph the remaining plate, matched indoor or outdoor component, and any installation tags that help confirm tonnage and model family.</li>"
      )
    }
    "Water Heaters" {
      return @(
        "<li><strong>Water damage:</strong> Identify whether the tank failed, a fitting leaked, or venting was compromised before assuming full replacement scope.</li>",
        "<li><strong>Electrical or control failure:</strong> Preserve evidence from control modules, ignition components, or hybrid electronics if the claim involves power interruption or surge.</li>",
        "<li><strong>Age-related failure:</strong> Tie the production range to tank capacity, fuel type, and venting so the age note supports a like kind and quality path.</li>",
        "<li><strong>Partial label missing:</strong> Capture fuel, venting, gallon size, and any readable serial fragments before the unit is removed.</li>"
      )
    }
    default {
      return @(
        "<li><strong>Water damage:</strong> Document whether the loss affected controls, finish surfaces, insulation, or the installation cavity before selecting a replacement path.</li>",
        "<li><strong>Electrical failure:</strong> Keep photos of control panels, outlets, breakers, and any surge evidence because electrical claims often turn on whether the failure was isolated or system-wide.</li>",
        "<li><strong>Age-related failure:</strong> Use the production range to support the file, but keep configuration and feature tier attached so the age note does not become the only basis for replacement.</li>",
        "<li><strong>Partial label missing:</strong> Photograph any remaining model or serial fragments, the overall configuration, and comparable labels on paired equipment before the item is removed.</li>"
      )
    }
  }
}

foreach ($page in $serialPages) {
  $canonical = "/serial/$($page.Slug)"
  $title = "$($page.Brand) Serial Number Lookup and Age Verification"
  $description = "Use Bolt's $($page.Brand) serial number lookup page to verify equipment age, support insurance claim documentation, and improve LKQ replacement research."
  $faq = Get-SerialFaq $page
  $matchingModels = @($modelPages | Where-Object { $_.BrandSlug -eq $page.BrandSlug -or $_.SerialSlug -eq $page.Slug } | Select-Object -First 5)
  if ($matchingModels.Count -lt 3) {
    $matchingModels += @($modelPages | Where-Object { $_.CategorySlug -eq $page.CategorySlug -and $_.ModelSlug -notin $matchingModels.ModelSlug } | Select-Object -First (5 - $matchingModels.Count))
  }
  $matchingReplacements = @($matchingModels | Select-Object -First 5)
  if ($page.Related.Count -gt 0) {
    $relatedList = $page.Related
  } else {
    $relatedList = ($serialPages | Where-Object { $_.CategorySlug -eq $page.CategorySlug -and $_.Slug -ne $page.Slug } | Select-Object -First 3 -ExpandProperty Slug)
  }
  $relatedItems = foreach ($slug in $relatedList) {
    $relatedPage = $serialPages | Where-Object { $_.Slug -eq $slug }
    "<li><a href=`"/serial/$slug`">$($relatedPage.Brand) serial number lookup</a></li>"
  }
  $commonBrandItems = foreach ($brandItem in ($serialPages | Where-Object { $_.CategorySlug -eq $page.CategorySlug -and $_.BrandSlug -ne $page.BrandSlug } | Group-Object BrandSlug | Select-Object -First 5)) {
    $brandPage = $brandItem.Group[0]
    "<li><a href=`"/brand/$($brandPage.BrandSlug)`">$($brandPage.Brand) $($page.CategoryName.ToLower()) research</a></li>"
  }
  $relatedModelItems = foreach ($modelItem in $matchingModels) {
    "<li><a href=`"/model/$($modelItem.BrandSlug)/$($modelItem.ModelSlug)`">$($modelItem.Brand) $($modelItem.Model) model research</a></li>"
  }
  $relatedReplacementItems = foreach ($modelItem in $matchingReplacements) {
    "<li><a href=`"/replacement/$($modelItem.ReplacementSlug)`">Replacement options for $($modelItem.Brand) $($modelItem.Model)</a></li>"
  }
  $faqMarkup = foreach ($item in $faq) {
@"
        <li>
          <strong>$($item.Q)</strong>
          <p>$($item.A)</p>
        </li>
"@
  }
  $howToSteps = @(
    [ordered]@{ "@type" = "HowToStep"; text = "Find the original manufacturer data plate on the equipment." },
    [ordered]@{ "@type" = "HowToStep"; text = "Record the model and serial number exactly as shown on the label." },
    [ordered]@{ "@type" = "HowToStep"; text = "Read the serial result with the correct product family and field context." },
    [ordered]@{ "@type" = "HowToStep"; text = "Carry the verified production range into claim notes and replacement review." }
  )
  $faqSchema = foreach ($item in $faq) {
    [ordered]@{
      "@type" = "Question"
      name = $item.Q
      acceptedAnswer = [ordered]@{
        "@type" = "Answer"
        text = $item.A
      }
    }
  }
  $schemaGraph = @(
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "SoftwareApplication"
      name = "Bolt Serial Number Lookup"
      applicationCategory = "BusinessApplication"
      operatingSystem = "Web"
      url = "https://www.boltresearchteam.com$canonical"
      description = $description
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "BreadcrumbList"
      itemListElement = @(
        [ordered]@{ "@type" = "ListItem"; position = 1; name = "Home"; item = "https://www.boltresearchteam.com/" },
        [ordered]@{ "@type" = "ListItem"; position = 2; name = $page.CategoryName; item = "https://www.boltresearchteam.com/category/$($page.CategorySlug)" },
        [ordered]@{ "@type" = "ListItem"; position = 3; name = "$($page.Brand) Serial Number Lookup"; item = "https://www.boltresearchteam.com$canonical" }
      )
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "HowTo"
      name = "$($page.Brand) serial number age verification workflow"
      description = "Field workflow for using a $($page.Brand) serial number to support insurance claim documentation."
      step = $howToSteps
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "FAQPage"
      mainEntity = $faqSchema
    }
  ) | ConvertTo-Json -Depth 8
  $html = @"
$(Get-PageHead $title $description $canonical)
$(Get-HeaderMarkup)
  <div class="seo-breadcrumbs"><a href="/">Home</a> / <a href="/category/$($page.CategorySlug)">$($page.CategoryName)</a> / $($page.Brand)</div>
  <section class="seo-hero">
    <div class="seo-label">Serial Lookup Workflow</div>
    <h1>$($page.Brand) Serial Number Lookup and Age Verification</h1>
    <p class="seo-lead">$($page.Focus)</p>
    <p class="seo-lead">$($page.Notes)</p>
  </section>
  <div class="seo-grid">
    <main class="seo-main">
      <section class="seo-card">
        <h2>How to Use This Tool</h2>
        <div class="seo-steps">
          <div class="seo-step"><strong>1. Enter the full serial number exactly as shown.</strong><span>Record every character from the original manufacturer data plate, including leading zeros and any letter prefixes. Do not shorten the code for convenience in the claim file.</span></div>
          <div class="seo-step"><strong>2. Confirm the brand and category before decoding.</strong><span>Make sure the item is actually a $($page.Brand) $($page.CategoryName.ToLower()) product family and not a related OEM or mixed-system component. Serial formats can change across product categories.</span></div>
          <div class="seo-step"><strong>3. Cross-check the model number if available.</strong><span>Use the model field, physical configuration, and installation context to confirm that the serial format is being read against the correct product family, especially if the date code can repeat by decade or series.</span></div>
          <div class="seo-step"><strong>4. Carry the result into the claim file.</strong><span>Document the production year, week, or estimated range together with the full label photo and the basis for any assumptions so depreciation and LKQ review remain defensible.</span></div>
        </div>
      </section>
      <section class="seo-card">
        <h2>Where to Find the Serial Number</h2>
        <p>$($page.Locate)</p>
        <p>For appliances, common label points include the dishwasher tub lip, refrigerator liner, washer lid opening, dryer door frame, oven frame, or rear service panel. For HVAC, check the outdoor condenser cabinet, indoor air-handler panel, furnace burner compartment, and any matched indoor heads on ductless systems. For water heaters, inspect the jacket rating plate on the front or side of the tank, not just the installation sticker. In the field, photograph the entire plate before cleaning, moving, or disconnecting the item so model, serial, voltage, fuel, venting, and capacity clues remain together.</p>
      </section>
      <section class="seo-card">
        <h2>How $($page.Brand) Serial Numbers Work</h2>
        <p>$($page.Notes)</p>
        <p>Serial formats usually combine letters and numbers to indicate production timing, plant, product family, or sequence. Some $($page.Brand) formats allow an exact year-and-week read from the original plate. Others only support a narrower estimate after you compare the model series, visible styling, and known market window. A serial number can help confirm age, but it usually does not confirm full specifications, capacity, or feature tier by itself.</p>
        <h3>Confidence Notes</h3>
        <ul>
          <li>Some serial formats allow exact year or week identification when the original plate is intact and tied to the correct product family.</li>
          <li>Others require estimation based on repeating year codes, series patterns, or model-era clues.</li>
          <li>If the code does not cleanly resolve to one production cycle, write the result as an estimate and state what evidence narrowed the range.</li>
        </ul>
      </section>
      <section class="seo-card">
        <h2>What This Means for Insurance Claims</h2>
        <p>Age matters because it affects depreciation, actual cash value analysis, replacement positioning, and the credibility of the overall claim narrative. Serial-based age verification is often the fastest way to place an item into the correct production window, but serial alone is not always enough to support the whole replacement decision. Adjusters should also document model number, category, utility type, capacity class, and visible configuration. If the serial interpretation depends on repeated date codes, mixed-system components, or a partially damaged label, document the assumption directly in the file instead of presenting the result as a confirmed date.</p>
      </section>
      <section class="seo-card">
        <h2>Common Mistakes</h2>
        <ul>
          <li>Using the model number instead of the serial number when the page is intended to support age verification from the manufacturer plate.</li>
          <li>Misreading characters such as 0 versus O, 1 versus I, or 5 versus S after heat, moisture, or label wear affected readability.</li>
          <li>Ignoring manufacturer and product-family variations when the brand uses different serial logic across appliances, HVAC, or water-heater lines.</li>
          <li>Assuming an exact manufacturing date when the format only supports an estimated range based on series patterns.</li>
          <li>Writing an age conclusion without attaching the full data-plate photo and the reasoning used to narrow the production window.</li>
        </ul>
      </section>
      <section class="seo-card">
        <h2>Common Claim Scenarios</h2>
        <ul>
          <li><strong>Missing label or partial serial:</strong> Preserve visible fragments, overall configuration, and any matching indoor or outdoor component labels before removal.</li>
          <li><strong>Fire or water damage obscuring data:</strong> Photograph the plate before cleaning or handling it aggressively. Heat, soot, and mineral staining can distort characters and create avoidable read errors.</li>
          <li><strong>Older units with unreadable tags:</strong> Use model-era clues, visible styling, install context, and category-specific specifications to support an estimated age note when the serial cannot be fully restored.</li>
          <li><strong>Mixed components in HVAC systems:</strong> Document condenser, furnace, coil, air handler, and indoor-head labels separately because each component can carry a different age and model family.</li>
        </ul>
      </section>
      <section class="seo-card">
        <h2>Related Tools and Next Steps</h2>
        <p>Use the brand page when you need a broader $($page.Brand) claims workflow or want to compare serial conventions across related product lines. Move to a model page when the exact item needs configuration, size, or feature-tier analysis. Use a replacement page when the file has already identified the original item and now needs a like kind and quality match supported by installation type, capacity, and utility details.</p>
        <ul class="seo-link-list">
          <li><a href="/brand/$($page.BrandSlug)">$($page.Brand) brand research and claim workflow</a></li>
          <li><a href="/category/$($page.CategorySlug)">$($page.CategoryName) serial lookup and age verification</a></li>
$($relatedModelItems -join "`n")
$($relatedReplacementItems -join "`n")
        </ul>
      </section>
      <section class="seo-card">
        <h2>FAQ</h2>
        <ul class="seo-faq-list">
$($faqMarkup -join "`n")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Related Serial Lookups</h2>
        <ul class="seo-link-list">
          <li><a href="/serial/$($page.Slug)">$($page.Brand) serial number lookup</a></li>
$($relatedItems -join "`n")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Common Brands in This Category</h2>
        <ul class="seo-link-list">
          <li><a href="/category/$($page.CategorySlug)">$($page.CategoryName) age verification</a></li>
          <li><a href="/brand/$($page.BrandSlug)">$($page.Brand) brand research</a></li>
$($commonBrandItems -join "`n")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Related Replacement Research</h2>
        <ul class="seo-link-list">
          <li><a href="/item-age">Live item age and serial number workflow</a></li>
$($relatedReplacementItems -join "`n")
        </ul>
      </section>
    </main>
    <aside class="seo-sidebar">
      <section class="seo-card">
        <h2>Related Workflow Links</h2>
        <ul class="seo-link-list">
          <li><a href="/brand/$($page.BrandSlug)">$($page.Brand) brand page</a></li>
          <li><a href="/category/$($page.CategorySlug)">$($page.CategoryName.ToLower()) age verification</a></li>
          <li><a href="/item-age">Open the live decoder tool</a></li>
          <li><a href="/brand/$($page.BrandSlug)">$($page.Brand) claim research by brand</a></li>
        </ul>
      </section>
      <section class="seo-card">
        <h2>Field Checklist</h2>
        <div class="seo-metric">
          <div><strong>Capture</strong>Full label photo, model, serial, and product type.</div>
          <div><strong>Verify</strong>Any repeated date-code pattern against physical age clues.</div>
          <div><strong>Match</strong>Replacement by configuration, capacity or tonnage, and feature tier.</div>
        </div>
      </section>
      <section class="seo-card">
        <h2>Claims Note</h2>
        <div class="seo-note">If the serial number supports more than one production cycle, write the narrower conclusion as an estimate and state what evidence was used to select that range.</div>
      </section>
    </aside>
  </div>
  <script type="application/ld+json">
$schemaGraph
  </script>
$(Get-FooterMarkup)
"@
  Set-Content -Path (Join-Path "serial" ($page.Slug + ".html")) -Value $html -Encoding UTF8
}

foreach ($group in $brandGroups) {
  $brand = $group.Group[0].Brand
  $brandSlug = $group.Name
  $primaryCategory = $group.Group[0].CategorySlug
  $categoryName = $group.Group[0].CategoryName
  $canonical = "/brand/$brandSlug"
  $title = "$brand Item Research and Serial Lookup for Insurance Claims"
  $description = Get-BrandDescription $group
  $serialLinks = foreach ($item in $group.Group) {
    "<li><a href=`"/serial/$($item.Slug)`">$($item.Brand) serial number lookup</a></li>"
  }
  $modelLinks = foreach ($model in ($modelPages | Where-Object { $_.BrandSlug -eq $brandSlug })) {
    "<li><a href=`"/model/$($model.BrandSlug)/$($model.ModelSlug)`">$($model.Brand) $($model.Model) identification and replacement research</a></li>"
  }
  if ($modelLinks.Count -eq 0) {
    $modelLinks = @("<li><a href=`"/category/$primaryCategory`">$($categoryName.ToLower()) age verification workflow</a></li>")
  }
  $faq = @(
    [ordered]@{ Q = "What should I capture on a $brand claim inspection?"; A = "Record the full data plate, product type, major configuration details, and any size, capacity, or tonnage information that will affect replacement matching." },
    [ordered]@{ Q = "When should I use the serial lookup page?"; A = "Use it as soon as you have the original label photo and need to support an age note or depreciation decision." },
    [ordered]@{ Q = "What matters for LKQ?"; A = "Match installation type, size or capacity, utility source, and feature tier before relying on brand name alone." }
  )
  $faqMarkup = foreach ($q in $faq) { "<li><strong>$($q.Q)</strong><p>$($q.A)</p></li>" }
  $schema = @(
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "CollectionPage"
      name = "$brand item research"
      url = "https://www.boltresearchteam.com$canonical"
      description = $description
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "BreadcrumbList"
      itemListElement = @(
        [ordered]@{ "@type" = "ListItem"; position = 1; name = "Home"; item = "https://www.boltresearchteam.com/" },
        [ordered]@{ "@type" = "ListItem"; position = 2; name = $categoryName; item = "https://www.boltresearchteam.com/category/$primaryCategory" },
        [ordered]@{ "@type" = "ListItem"; position = 3; name = $brand; item = "https://www.boltresearchteam.com$canonical" }
      )
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "FAQPage"
      mainEntity = ($faq | ForEach-Object {
        [ordered]@{
          "@type" = "Question"
          name = $_.Q
          acceptedAnswer = [ordered]@{ "@type" = "Answer"; text = $_.A }
        }
      })
    }
  ) | ConvertTo-Json -Depth 7
  $html = @"
$(Get-PageHead $title $description $canonical)
$(Get-HeaderMarkup)
  <div class="seo-breadcrumbs"><a href="/">Home</a> / <a href="/category/$primaryCategory">$categoryName</a> / $brand</div>
  <section class="seo-hero">
    <div class="seo-label">Brand Workflow</div>
    <h1>$brand Item Research for Insurance Claims</h1>
    <p class="seo-lead">$description</p>
    <p class="seo-lead">Start with the brand-specific serial pages, then move into model and replacement workflows when the file requires deeper identification or LKQ support.</p>
  </section>
  <div class="seo-grid">
    <main class="seo-main">
      <section class="seo-card">
        <h2>Serial Lookup Pages for $brand</h2>
        <ul class="seo-link-list">
          $($serialLinks -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Model and Replacement Workflows</h2>
        <ul class="seo-link-list">
          $($modelLinks -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>FAQ</h2>
        <ul class="seo-faq-list">
          $($faqMarkup -join "`n          ")
        </ul>
      </section>
    </main>
    <aside class="seo-sidebar">
      <section class="seo-card">
        <h2>Category Link</h2>
        <ul class="seo-link-list">
          <li><a href="/category/$primaryCategory">$($categoryName.ToLower()) age verification</a></li>
          <li><a href="/item-age">Open the live decoder tool</a></li>
        </ul>
      </section>
      <section class="seo-card">
        <h2>Claims Reminder</h2>
        <div class="seo-note">A brand match is not automatically an LKQ match. Keep the file anchored to configuration, capacity or tonnage, utility type, and feature tier.</div>
      </section>
    </aside>
  </div>
  <script type="application/ld+json">
$schema
  </script>
$(Get-FooterMarkup)
"@
  Set-Content -Path (Join-Path "brand" ($brandSlug + ".html")) -Value $html -Encoding UTF8
}

foreach ($page in $categoryMeta) {
  $canonical = "/category/$($page.Slug)"
  $title = "$($page.Name) Serial Number Lookup and Age Verification for Insurance Claims"
  $description = "Use Bolt's $($page.Name.ToLower()) category page to support item identification, age verification, model research, and LKQ replacement workflows for insurance claims."
  $brandLinks = foreach ($group in ($brandGroups | Where-Object { $_.Group[0].CategorySlug -eq $page.Slug })) {
    $brand = $group.Group[0].Brand
    $brandSlug = $group.Name
    $firstSerial = $group.Group[0].Slug
    "<li><a href=`"/brand/$brandSlug`">$brand brand page</a> <span>&middot;</span> <a href=`"/serial/$firstSerial`">$brand serial number lookup</a></li>"
  }
  $featuredModels = foreach ($model in ($modelPages | Where-Object { $_.CategorySlug -eq $page.Slug } | Select-Object -First 6)) {
    "<li><a href=`"/model/$($model.BrandSlug)/$($model.ModelSlug)`">$($model.Brand) $($model.Model) model research</a></li>"
  }
  $faq = @(
    [ordered]@{ Q = "What should I verify on a $($page.Name.ToLower()) claim?"; A = "Capture the manufacturer label, confirm the exact item type, and record the specification fields that affect replacement quality." },
    [ordered]@{ Q = "Is age alone enough for LKQ?"; A = "No. Age supports the file, but category-specific configuration and feature details usually drive the replacement decision." },
    [ordered]@{ Q = "When should I use the serial pages?"; A = "Use them as soon as you have a readable label and need to support a production-range conclusion." }
  )
  $faqMarkup = foreach ($q in $faq) { "<li><strong>$($q.Q)</strong><p>$($q.A)</p></li>" }
  $schema = @(
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "CollectionPage"
      name = "$($page.Name) insurance claim research"
      url = "https://www.boltresearchteam.com$canonical"
      description = $description
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "BreadcrumbList"
      itemListElement = @(
        [ordered]@{ "@type" = "ListItem"; position = 1; name = "Home"; item = "https://www.boltresearchteam.com/" },
        [ordered]@{ "@type" = "ListItem"; position = 2; name = $page.Name; item = "https://www.boltresearchteam.com$canonical" }
      )
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "FAQPage"
      mainEntity = ($faq | ForEach-Object {
        [ordered]@{
          "@type" = "Question"
          name = $_.Q
          acceptedAnswer = [ordered]@{ "@type" = "Answer"; text = $_.A }
        }
      })
    }
  ) | ConvertTo-Json -Depth 7
  $html = @"
$(Get-PageHead $title $description $canonical)
$(Get-HeaderMarkup)
  <div class="seo-breadcrumbs"><a href="/">Home</a> / $($page.Name)</div>
  <section class="seo-hero">
    <div class="seo-label">Category Workflow</div>
    <h1>$($page.Name) Serial Number Lookup and Age Verification for Insurance Claims</h1>
    <p class="seo-lead">$($page.Intro)</p>
    <p class="seo-lead">$($page.Details)</p>
  </section>
  <div class="seo-grid">
    <main class="seo-main">
      <section class="seo-card">
        <h2>Brand and Serial Pages</h2>
        <ul class="seo-link-list">
          $($brandLinks -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Featured Model Research Pages</h2>
        <ul class="seo-link-list">
          $($featuredModels -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>FAQ</h2>
        <ul class="seo-faq-list">
          $($faqMarkup -join "`n          ")
        </ul>
      </section>
    </main>
    <aside class="seo-sidebar">
      <section class="seo-card">
        <h2>Related Paths</h2>
        <ul class="seo-link-list">
          <li><a href="/">Homepage research tool</a></li>
          <li><a href="/item-age">Live decoder tool</a></li>
          <li><a href="/replacement/$(($modelPages | Where-Object { $_.CategorySlug -eq $page.Slug } | Select-Object -First 1).ReplacementSlug)">Replacement workflow example</a></li>
        </ul>
      </section>
    </aside>
  </div>
  <script type="application/ld+json">
$schema
  </script>
$(Get-FooterMarkup)
"@
  Set-Content -Path (Join-Path "category" ($page.Slug + ".html")) -Value $html -Encoding UTF8
}

foreach ($model in $modelPages) {
  $brandCanonical = "/brand/$($model.BrandSlug)"
  $modelCanonical = "/model/$($model.BrandSlug)/$($model.ModelSlug)"
  $replacementCanonical = "/replacement/$($model.ReplacementSlug)"
  $title = "$($model.Brand) $($model.Model) Identification, Age, and Replacement Research"
  $description = "Use Bolt's model page for $($model.Brand) $($model.Model) to support identification, estimated age review, and like kind and quality replacement research."
  $featureTier = Get-FeatureTier $model.Specs $model.Overview
  $utilityType = Get-UtilityType $model.Specs $model.Overview
  $installationType = Get-InstallationType $model.Specs $model.Overview
  $sizeClass = Get-SizeClass $model.Specs
  $claimScenarioMarkup = Get-ClaimScenarioMarkup $model.CategoryName
  $faq = @(
    [ordered]@{ Q = "Can I identify age from the model page alone?"; A = "Use the model page to narrow the production range, then tie the conclusion back to the original serial label whenever it is available." },
    [ordered]@{ Q = "What matters most for replacement research?"; A = "Configuration, capacity or tonnage, utility type, and feature tier should stay tied to the original item before a replacement is treated as comparable." },
    [ordered]@{ Q = "What should go into the claim note?"; A = "Document the model, estimated production range, key specifications, and the reasons a replacement was treated as like kind and quality." }
  )
  $faqMarkup = foreach ($q in $faq) { "<li><strong>$($q.Q)</strong><p>$($q.A)</p></li>" }
  $specMarkup = foreach ($spec in $model.Specs) { "<li>$spec</li>" }
  $compareMarkup = foreach ($item in $model.Comparables) {
    "<li><strong>${item}:</strong> Valid as a comparison point because it stays in the same practical size or capacity class, matches the core configuration, and remains within the same general feature tier expected for the original item.</li>"
  }
  $docMarkup = foreach ($note in $model.DocumentationNotes) { "<li>$note</li>" }
  $relatedModelsMarkup = foreach ($relatedModel in ($modelPages | Where-Object { $_.CategorySlug -eq $model.CategorySlug -and $_.ModelSlug -ne $model.ModelSlug } | Select-Object -First 4)) {
    "<li><a href=`"/model/$($relatedModel.BrandSlug)/$($relatedModel.ModelSlug)`">$($relatedModel.Brand) $($relatedModel.Model) model research</a></li>"
  }
  $otherBrandModelsMarkup = foreach ($brandModel in ($modelPages | Where-Object { $_.BrandSlug -eq $model.BrandSlug -and $_.ModelSlug -ne $model.ModelSlug } | Select-Object -First 4)) {
    "<li><a href=`"/model/$($brandModel.BrandSlug)/$($brandModel.ModelSlug)`">$($brandModel.Brand) $($brandModel.Model) identification research</a></li>"
  }
  if ($otherBrandModelsMarkup.Count -eq 0) {
    $otherBrandModelsMarkup = @(
      "<li><a href=`"/brand/$($model.BrandSlug)`">$($model.Brand) brand research</a></li>",
      "<li><a href=`"/serial/$($model.SerialSlug)`">$($model.Brand) serial number lookup</a></li>"
    )
  }
  $similarReplacementMarkup = foreach ($replacementModel in ($modelPages | Where-Object { $_.CategorySlug -eq $model.CategorySlug -and $_.ModelSlug -ne $model.ModelSlug } | Select-Object -First 4)) {
    "<li><a href=`"/replacement/$($replacementModel.ReplacementSlug)`">Replacement options for $($replacementModel.Brand) $($replacementModel.Model)</a></li>"
  }
  $schema = @(
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "Product"
      name = "$($model.Brand) $($model.Model)"
      category = $model.CategoryName
      brand = [ordered]@{ "@type" = "Brand"; name = $model.Brand }
      description = $model.Overview
      url = "https://www.boltresearchteam.com$modelCanonical"
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "BreadcrumbList"
      itemListElement = @(
        [ordered]@{ "@type" = "ListItem"; position = 1; name = "Home"; item = "https://www.boltresearchteam.com/" },
        [ordered]@{ "@type" = "ListItem"; position = 2; name = $model.Brand; item = "https://www.boltresearchteam.com$brandCanonical" },
        [ordered]@{ "@type" = "ListItem"; position = 3; name = $model.Model; item = "https://www.boltresearchteam.com$modelCanonical" }
      )
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "FAQPage"
      mainEntity = ($faq | ForEach-Object {
        [ordered]@{
          "@type" = "Question"
          name = $_.Q
          acceptedAnswer = [ordered]@{ "@type" = "Answer"; text = $_.A }
        }
      })
    }
  ) | ConvertTo-Json -Depth 7
  New-Item -ItemType Directory -Force -Path (Join-Path "model" $model.BrandSlug) | Out-Null
  $html = @"
$(Get-PageHead $title $description $modelCanonical)
$(Get-HeaderMarkup)
  <div class="seo-breadcrumbs"><a href="/">Home</a> / <a href="$brandCanonical">$($model.Brand)</a> / $($model.Model)</div>
  <section class="seo-hero">
    <div class="seo-label">Model Workflow</div>
    <h1>$($model.Brand) $($model.Model) Identification, Age, and Replacement Research</h1>
    <p class="seo-lead">$($model.Overview)</p>
    <p class="seo-lead">This static model page is designed for adjusters who need a fast bridge from label evidence into production-range context and replacement screening.</p>
  </section>
  <div class="seo-grid">
    <main class="seo-main">
      <section class="seo-card">
        <h2>Model Overview</h2>
        <p>$($model.Overview)</p>
        <p><strong>Category:</strong> $($model.CategoryName). <strong>Typical use case:</strong> Residential claim handling where the original item must be identified quickly enough to support age review and replacement screening. <strong>Build tier:</strong> $featureTier.</p>
      </section>
      <section class="seo-card">
        <h2>Estimated Age / Production Range</h2>
        <p>$($model.AgeRange)</p>
        <p><strong>Reasoning:</strong> This estimate is based on known model-series timing, current market references, and where this item sits inside the surrounding product generation. <strong>Confidence level:</strong> Estimated unless the original serial label confirms a narrower production window.</p>
      </section>
      <section class="seo-card">
        <h2>Key Specifications (if known)</h2>
        <p><strong>Capacity / size class:</strong> $sizeClass. <strong>Fuel type:</strong> $utilityType. <strong>Installation type:</strong> $installationType. <strong>Feature tier:</strong> $featureTier.</p>
        <ul>
          $($specMarkup -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Comparable Replacement Options</h2>
        <p>Each replacement below is screened as a practical comparison because it stays close on size or capacity, configuration, and feature tier. The goal is not to find a brand twin; the goal is to keep the replacement inside the same functional and quality range as the original item.</p>
        <ul>
          $($compareMarkup -join "`n          ")
        </ul>
        <p><a href="$replacementCanonical">Review replacement options for $($model.Model)</a> to move from identification into LKQ comparison.</p>
      </section>
      <section class="seo-card">
        <h2>Insurance Documentation Notes</h2>
        <p>Use the model page to support the file, but keep the claim note tied to the original label and field evidence. Model research is strongest when it is paired with configuration, utility type, and installation context from the inspection.</p>
        <ul>
          <li>Document model and serial if available before the item is removed.</li>
          <li>Match configuration and fuel type before selecting a replacement path.</li>
          <li>Avoid upgrading feature tier unless the file clearly justifies it.</li>
          $($docMarkup -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Common Claim Scenarios</h2>
        <ul>
          $($claimScenarioMarkup -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>FAQ</h2>
        <ul class="seo-faq-list">
          $($faqMarkup -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Related Models</h2>
        <ul class="seo-link-list">
          <li><a href="/model/$($model.BrandSlug)/$($model.ModelSlug)">$($model.Brand) $($model.Model) model research</a></li>
          $($relatedModelsMarkup -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Other Models from $($model.Brand)</h2>
        <ul class="seo-link-list">
          $($otherBrandModelsMarkup -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Replacement Research for Similar Items</h2>
        <ul class="seo-link-list">
          <li><a href="$replacementCanonical">Replacement options for $($model.Model)</a></li>
          $($similarReplacementMarkup -join "`n          ")
        </ul>
      </section>
    </main>
    <aside class="seo-sidebar">
      <section class="seo-card">
        <h2>Workflow Links</h2>
        <ul class="seo-link-list">
          <li><a href="$brandCanonical">$($model.Brand) brand page</a></li>
          <li><a href="/serial/$($model.SerialSlug)">$($model.Brand) serial number lookup</a></li>
          <li><a href="$replacementCanonical">Replacement options for $($model.Model)</a></li>
          <li><a href="/category/$($model.CategorySlug)">$($model.CategoryName.ToLower()) age verification</a></li>
          <li><a href="/brand/$($model.BrandSlug)">$($model.Brand) brand replacement workflow</a></li>
        </ul>
      </section>
    </aside>
  </div>
  <script type="application/ld+json">
$schema
  </script>
$(Get-FooterMarkup)
"@
  Set-Content -Path (Join-Path (Join-Path "model" $model.BrandSlug) ($model.ModelSlug + ".html")) -Value $html -Encoding UTF8
}

foreach ($model in $modelPages) {
  $brandCanonical = "/brand/$($model.BrandSlug)"
  $modelCanonical = "/model/$($model.BrandSlug)/$($model.ModelSlug)"
  $replacementCanonical = "/replacement/$($model.ReplacementSlug)"
  $title = "Replacement Options for $($model.Model)"
  $description = "Use Bolt's replacement page for $($model.Model) to compare like kind and quality options, specification matches, and claim-ready replacement notes."
  $featureTier = Get-FeatureTier $model.Specs $model.Overview
  $utilityType = Get-UtilityType $model.Specs $model.Overview
  $installationType = Get-InstallationType $model.Specs $model.Overview
  $sizeClass = Get-SizeClass $model.Specs
  $faq = @(
    [ordered]@{ Q = "What matters most when comparing replacements?"; A = "Match the original configuration, capacity or tonnage, utility type, and feature tier before treating a replacement as comparable." },
    [ordered]@{ Q = "Can the replacement be a different brand?"; A = "Yes, if the utility, capacity, installation type, and quality tier are still like kind and quality for the original item." },
    [ordered]@{ Q = "What should the final claim note include?"; A = "Document the original model summary, the key matching criteria, and the reasons each replacement option was considered comparable." }
  )
  $faqMarkup = foreach ($q in $faq) { "<li><strong>$($q.Q)</strong><p>$($q.A)</p></li>" }
  $itemListSchema = @()
  $replacementList = @()
  $position = 1
  foreach ($item in $model.Comparables) {
    $replacementList += "<li><strong>${item}:</strong> Valid because it stays close on size class, installation type, utility type, and overall feature tier for the original item.</li>"
    $itemListSchema += [ordered]@{
      "@type" = "ListItem"
      position = $position
      name = $item
    }
    $position++
  }
  $specNoteMarkup = foreach ($spec in $model.Specs) {
    "<li>Match or closely approximate: $spec.</li>"
  }
  $relatedReplacementLinks = foreach ($replacementModel in ($modelPages | Where-Object { $_.CategorySlug -eq $model.CategorySlug -and $_.ReplacementSlug -ne $model.ReplacementSlug } | Select-Object -First 4)) {
    "<li><a href=`"/replacement/$($replacementModel.ReplacementSlug)`">Replacement options for $($replacementModel.Brand) $($replacementModel.Model)</a></li>"
  }
  $similarModelLinks = foreach ($relatedModel in ($modelPages | Where-Object { $_.CategorySlug -eq $model.CategorySlug -and $_.ModelSlug -ne $model.ModelSlug } | Select-Object -First 4)) {
    "<li><a href=`"/model/$($relatedModel.BrandSlug)/$($relatedModel.ModelSlug)`">$($relatedModel.Brand) $($relatedModel.Model) model research</a></li>"
  }
  $otherBrandReplacementLinks = foreach ($brandModel in ($modelPages | Where-Object { $_.BrandSlug -eq $model.BrandSlug -and $_.ReplacementSlug -ne $model.ReplacementSlug } | Select-Object -First 4)) {
    "<li><a href=`"/replacement/$($brandModel.ReplacementSlug)`">$($brandModel.Brand) $($brandModel.Model) replacement research</a></li>"
  }
  if ($otherBrandReplacementLinks.Count -eq 0) {
    $otherBrandReplacementLinks = @(
      "<li><a href=`"/brand/$($model.BrandSlug)`">$($model.Brand) brand page</a></li>",
      "<li><a href=`"/serial/$($model.SerialSlug)`">$($model.Brand) serial number lookup</a></li>"
    )
  }
  $schema = @(
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "Product"
      name = "Replacement options for $($model.Model)"
      category = $model.CategoryName
      brand = [ordered]@{ "@type" = "Brand"; name = $model.Brand }
      description = "Replacement workflow page for $($model.Brand) $($model.Model)."
      url = "https://www.boltresearchteam.com$replacementCanonical"
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "ItemList"
      name = "Comparable replacement options for $($model.Model)"
      itemListElement = $itemListSchema
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "BreadcrumbList"
      itemListElement = @(
        [ordered]@{ "@type" = "ListItem"; position = 1; name = "Home"; item = "https://www.boltresearchteam.com/" },
        [ordered]@{ "@type" = "ListItem"; position = 2; name = $model.Brand; item = "https://www.boltresearchteam.com$brandCanonical" },
        [ordered]@{ "@type" = "ListItem"; position = 3; name = $model.Model; item = "https://www.boltresearchteam.com$modelCanonical" },
        [ordered]@{ "@type" = "ListItem"; position = 4; name = "Replacement Options"; item = "https://www.boltresearchteam.com$replacementCanonical" }
      )
    },
    [ordered]@{
      "@context" = "https://schema.org"
      "@type" = "FAQPage"
      mainEntity = ($faq | ForEach-Object {
        [ordered]@{
          "@type" = "Question"
          name = $_.Q
          acceptedAnswer = [ordered]@{ "@type" = "Answer"; text = $_.A }
        }
      })
    }
  ) | ConvertTo-Json -Depth 8
  $html = @"
$(Get-PageHead $title $description $replacementCanonical)
$(Get-HeaderMarkup)
  <div class="seo-breadcrumbs"><a href="/">Home</a> / <a href="$brandCanonical">$($model.Brand)</a> / <a href="$modelCanonical">$($model.Model)</a> / Replacement Options</div>
  <section class="seo-hero">
    <div class="seo-label">Replacement Workflow</div>
    <h1>Replacement Options for $($model.Model)</h1>
    <p class="seo-lead">Use this page to move from the original model into like kind and quality replacement review. The content is static so Google and field users both see the same comparison framework on first load.</p>
  </section>
  <div class="seo-grid">
    <main class="seo-main">
      <section class="seo-card">
        <h2>Original Model Summary</h2>
        <p>$($model.Overview)</p>
      </section>
      <section class="seo-card">
        <h2>LKQ Matching Criteria</h2>
        <p>LKQ screening for this item should stay focused on the original configuration, actual size class, working capacity, utility source, and feature tier. A replacement can be a different brand if those practical characteristics remain aligned with the original loss item.</p>
        <ul>
          <li><strong>Configuration:</strong> Match the original setup and working form factor, not just the brand badge.</li>
          <li><strong>Size / capacity:</strong> Keep the replacement in the same practical size class: $sizeClass.</li>
          <li><strong>Fuel type:</strong> Maintain the same utility source whenever required. Current read: $utilityType.</li>
          <li><strong>Installation type:</strong> Keep the fit and install context aligned. Current read: $installationType.</li>
          <li><strong>Feature tier:</strong> Stay within the same general quality band, which is treated here as $featureTier unless the file supports another tier.</li>
        </ul>
      </section>
      <section class="seo-card">
        <h2>Comparable Replacement Options</h2>
        <p>The options below are not just same-category products. Each one is screened because it stays within the same practical configuration and quality range, which is what makes the comparison usable in an adjuster workflow.</p>
        <ul>
          $($replacementList -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Why These Replacements Qualify as LKQ</h2>
        <p>Each option remains in the same general use case, size or capacity class, and feature band as the original item. That is the core reason the page treats them as defensible LKQ candidates.</p>
        <ul>
          <li>They stay aligned on the original item's configuration and intended installation context.</li>
          <li>They remain in the same practical size, capacity, or tonnage band rather than shifting the item into a larger or smaller class.</li>
          <li>They preserve the same utility path where that matters, including gas, electric, or matched HVAC system context.</li>
          <li>They avoid an unjustified jump in feature tier unless the original market position clearly requires it.</li>
        </ul>
      </section>
      <section class="seo-card">
        <h2>Specification Matching Notes</h2>
        <ul>
          $($specNoteMarkup -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>FAQ</h2>
        <ul class="seo-faq-list">
          $($faqMarkup -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Related Replacement Options</h2>
        <ul class="seo-link-list">
          <li><a href="$replacementCanonical">Replacement options for $($model.Model)</a></li>
          $($relatedReplacementLinks -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Similar Models</h2>
        <ul class="seo-link-list">
          <li><a href="$modelCanonical">$($model.Brand) $($model.Model) model page</a></li>
          $($similarModelLinks -join "`n          ")
        </ul>
      </section>
      <section class="seo-card">
        <h2>Other $($model.Brand) Replacements</h2>
        <ul class="seo-link-list">
          $($otherBrandReplacementLinks -join "`n          ")
        </ul>
      </section>
    </main>
    <aside class="seo-sidebar">
      <section class="seo-card">
        <h2>Workflow Links</h2>
        <ul class="seo-link-list">
          <li><a href="$modelCanonical">$($model.Brand) $($model.Model) model page</a></li>
          <li><a href="$brandCanonical">$($model.Brand) brand page</a></li>
          <li><a href="/category/$($model.CategorySlug)">$($model.CategoryName.ToLower()) age verification</a></li>
          <li><a href="/serial/$($model.SerialSlug)">$($model.Brand) serial number lookup</a></li>
          <li><a href="/brand/$($model.BrandSlug)">$($model.Brand) claim replacement workflow</a></li>
        </ul>
      </section>
    </aside>
  </div>
  <script type="application/ld+json">
$schema
  </script>
$(Get-FooterMarkup)
"@
  Set-Content -Path (Join-Path "replacement" ($model.ReplacementSlug + ".html")) -Value $html -Encoding UTF8
}

$sitemapEntries = @("https://www.boltresearchteam.com/")
$sitemapEntries += $categoryMeta | ForEach-Object { "https://www.boltresearchteam.com/category/$($_.Slug)" }
$sitemapEntries += $brandGroups | ForEach-Object { "https://www.boltresearchteam.com/brand/$($_.Name)" }
$sitemapEntries += $serialPages | ForEach-Object { "https://www.boltresearchteam.com/serial/$($_.Slug)" }
$sitemapEntries += $modelPages | ForEach-Object { "https://www.boltresearchteam.com/model/$($_.BrandSlug)/$($_.ModelSlug)" }
$sitemapEntries += $modelPages | ForEach-Object { "https://www.boltresearchteam.com/replacement/$($_.ReplacementSlug)" }

$sitemap = @(
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
)
foreach ($url in $sitemapEntries) {
  $priority = if ($url -eq "https://www.boltresearchteam.com/") {
    "1.0"
  } elseif ($url -like "*/serial/*") {
    "0.9"
  } elseif ($url -like "*/model/*" -or $url -like "*/replacement/*") {
    "0.85"
  } elseif ($url -like "*/brand/*") {
    "0.8"
  } else {
    "0.7"
  }
  $sitemap += "  <url>"
  $sitemap += "    <loc>$url</loc>"
  $sitemap += "    <changefreq>weekly</changefreq>"
  $sitemap += "    <priority>$priority</priority>"
  $sitemap += "  </url>"
}
$sitemap += "</urlset>"
Set-Content -Path "sitemap.xml" -Value ($sitemap -join "`n") -Encoding UTF8
