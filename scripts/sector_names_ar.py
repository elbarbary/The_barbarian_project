"""Arabic for the vendor's sector names the exchange does not name in Arabic.

The directory carries `sector_ar` for the exchange's own eighteen sectors, in
the Arabic the exchange publishes. Twelve names come from the vendor's
taxonomy and have no Arabic anywhere in the data, so every builder that fell
back to "the Arabic or the key" wrote the English into the Arabic field — and
on the page, `nameAr || name` never fell through. The app's SECTOR_AR table
(public/esthmr/data.js) has carried these twelve since the re-keying; this is
the same table for the builders, in definite form because the sector read
opens "في قطاع …".
"""

SECTOR_AR = {
    "Finance": "التمويل والخدمات المالية",
    "Non-Energy Minerals": "المعادن ومواد البناء",
    "Technology Services": "الخدمات التكنولوجية",
    "Process Industries": "الصناعات التحويلية",
    "Distribution Services": "خدمات التوزيع",
    "Transportation": "النقل",
    "Consumer Services": "الخدمات الاستهلاكية",
    "Industrial Services": "الخدمات الصناعية",
    "Communications": "الاتصالات",
    "Producer Manufacturing": "الصناعات الإنتاجية",
    "Health Services": "الخدمات الصحية",
    "Consumer Non-Durables": "السلع الاستهلاكية غير المعمّرة",
    "Unclassified": "غير مصنّف",
}


def sector_ar(name: str, filed: str | None = None) -> str:
    """The exchange's Arabic when it filed one, else this table, else the name."""
    return (filed or "").strip() or SECTOR_AR.get(name or "", "") or (name or "")
