import '../../l10n/app_localizations.dart';

/// The sector a company is filed under, in the reader's language.
///
/// The names arrive from the scan as English category codes and were printed
/// raw: an Arabic reader met a row of chips reading "Commercial Services",
/// "Non-Energy Minerals", "Consumer Non-Durables" above a directory otherwise
/// entirely in Arabic, and the same English word again on every company page
/// under the heading "القطاع".
///
/// The exchange's own eighteen sectors sit beside the vendor's twenty: EGX
/// classifies 220 of the 284 listings and publishes `sectorA` with each, so
/// those Arabic names are the exchange's own words rather than a translation
/// anyone here made up. The vendor's set stays for the 64 it does not name.
/// This is a table rather than a translation problem. Anything outside it is returned
/// untouched — a sector this app has no word for is better shown as filed than
/// guessed at, and the guard is what tells us a new one has appeared.
String sectorLabel(String sector, AppLocalizations l) => switch (sector) {
  'Finance' => l.sectorFinance,
  'Process Industries' => l.sectorProcessIndustries,
  'Non-Energy Minerals' => l.sectorNonEnergyMinerals,
  'Consumer Non-Durables' => l.sectorConsumerNonDurables,
  'Consumer Services' => l.sectorConsumerServices,
  'Industrial Services' => l.sectorIndustrialServices,
  'Health Technology' => l.sectorHealthTechnology,
  'Producer Manufacturing' => l.sectorProducerManufacturing,
  'Distribution Services' => l.sectorDistributionServices,
  'Health Services' => l.sectorHealthServices,
  'Technology Services' => l.sectorTechnologyServices,
  'Consumer Durables' => l.sectorConsumerDurables,
  'Retail Trade' => l.sectorRetailTrade,
  'Transportation' => l.sectorTransportation,
  'Commercial Services' => l.sectorCommercialServices,
  'Utilities' => l.sectorUtilities,
  'Communications' => l.sectorCommunications,
  'Energy Minerals' => l.sectorEnergyMinerals,
  'Electronic Technology' => l.sectorElectronicTechnology,
  'Miscellaneous' => l.sectorMiscellaneous,
  'Banks' => l.sectorBanks,
  'Basic Resources' => l.sectorBasicResources,
  'Building Materials' => l.sectorBuildingMaterials,
  'Contracting & Construction Engineering' => l.sectorContractingConstructionEngineering,
  'Education Services' => l.sectorEducationServices,
  'Energy & Support Services' => l.sectorEnergySupportServices,
  'Food, Beverages and Tobacco' => l.sectorFoodBeveragesAndTobacco,
  'Health Care & Pharmaceuticals' => l.sectorHealthCarePharmaceuticals,
  'IT , Media & Communication Services' => l.sectorItMediaCommunicationServices,
  'Industrial Goods , Services and Automobiles' => l.sectorIndustrialGoodsServicesAndAutomobiles,
  'Non-bank financial services' => l.sectorNonBankFinancialServices,
  'Paper & Packaging' => l.sectorPaperPackaging,
  'Real Estate' => l.sectorRealEstate,
  'Shipping & Transportation Services' => l.sectorShippingTransportationServices,
  'Textile & Durables' => l.sectorTextileDurables,
  'Trade & Distributors' => l.sectorTradeDistributors,
  'Travel & Leisure' => l.sectorTravelLeisure,
  _ => sector,
};

/// Every sector this app can name. The published directory must not grow one
/// outside it without somebody writing the Arabic.
const knownSectors = {
  'Banks',
  'Basic Resources',
  'Building Materials',
  'Contracting & Construction Engineering',
  'Education Services',
  'Energy & Support Services',
  'Food, Beverages and Tobacco',
  'Health Care & Pharmaceuticals',
  'IT , Media & Communication Services',
  'Industrial Goods , Services and Automobiles',
  'Non-bank financial services',
  'Paper & Packaging',
  'Real Estate',
  'Shipping & Transportation Services',
  'Textile & Durables',
  'Trade & Distributors',
  'Travel & Leisure',
  'Finance',
  'Process Industries',
  'Non-Energy Minerals',
  'Consumer Non-Durables',
  'Consumer Services',
  'Industrial Services',
  'Health Technology',
  'Producer Manufacturing',
  'Distribution Services',
  'Health Services',
  'Technology Services',
  'Consumer Durables',
  'Retail Trade',
  'Transportation',
  'Commercial Services',
  'Utilities',
  'Communications',
  'Energy Minerals',
  'Electronic Technology',
  'Miscellaneous',
};
