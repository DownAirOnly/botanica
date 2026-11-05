# Importing the legacy workbooks

In **Settings → Import spreadsheets**, choose one of the four supported workbook types. Botanica reads selected XLSX files **in the browser**, shows an import preview, and warns about ambiguous cells. Review the warnings and counts before confirming.

| Source | Interpretation | Limitations |
|---|---|---|
| MY HERBS.xlsx | Master Herb: name and directly parsable stored dry amounts; Powders: powder amounts. | Composite stock entries (`64 oz / 16 oz`, `1# bag`, counts plus bags) are **not silently summed**; unresolved quantities are flagged. `Amount Tinctured` intentionally is **not** imported as ready fluid extract stock until unit semantics are confirmed. |
| TINCTURE RECIPES.xlsx | Side-by-side proportional parts/ingredient columns | Non-numeric ingredient parts (`Dash`) are flagged and require manual correction. Unknown ingredients create catalog placeholders with zero stock for review. |
| Tea Recipes.xlsx | Named tea sections and `Ingredient – parts` lines | Ambiguous combined ingredients need manual cleanup; not all styling and notes survive. |
| INVENTORY.xlsx | Finished product names and common package sizes | Unfilled quantities are treated as **unknown/zero**, not as counted stock. |

**Important:** A successful parse is not the same as a verified physical stock count. Source files may contain duplicates and historical data. Export a backup before bulk updates. Do not upload the proprietary originals to a public Git repository.

Future milestones: a dedicated unresolved-import queue, item-name alias editor, lot-based stock receipt, richer formulas, supplier histories, and more automated reconciliation.

## Account-based import (v2)

Sign in with Google, create/select the appropriate private **herbal** workspace, then open Settings and import the workbooks individually. XLSX parsing happens in the browser; only **after** the user confirms the reviewed draft are extracted records saved to that workspace's Firestore JSON document. Do not select a general inventory workspace for the specialized herbal XLSX importer. Always export a private JSON backup before bulk import and verify the cloud save status afterward.
