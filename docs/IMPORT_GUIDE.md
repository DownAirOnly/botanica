# Importing the legacy workbooks

In **Settings → Import spreadsheets**, choose one of the four supported workbook types. Botanica reads selected XLSX files **in the browser**, shows an import preview, and warns about ambiguous cells. Review the warnings and counts before confirming.

| Source | Interpretation | Limitations |
|---|---|---|
| MY HERBS.xlsx | Master Herb: name and directly parsable stored dry amounts; Powders: powder amounts. | Composite stock entries (`64 oz / 16 oz`, `1# bag`, counts plus bags) are **not silently summed**; unresolved quantities are flagged. `Amount Tinctured` intentionally is **not** imported as ready fluid extract stock until unit semantics are confirmed. |
| TINCTURE RECIPES.xlsx | Side-by-side proportional parts/ingredient columns | Non-numeric ingredient parts (`Dash`) are flagged and require manual correction. Unknown ingredients create catalog placeholders with zero stock for review. |
| Tea Recipes.xlsx | Named tea sections and `Ingredient – parts` lines | Ambiguous combined ingredients need manual cleanup; not all styling and notes survive. |
| INVENTORY.xlsx | Finished product names and common package sizes | Unfilled quantities are treated as **unknown/zero**, not as counted stock. |

**Important:** A successful parse is not the same as a verified physical stock count. Source files may contain duplicates and historical data. Export a backup before bulk updates. Do not upload the proprietary originals to a public Git repository.

Future milestones: a dedicated unresolved-import queue, item-name alias editor, lot-based stock receipt, richer formulas, and more automated reconciliation.

## Supplier costs — v4

In a **Herbal Production** workspace, open **Settings → Import supplier prices** and select `HERBS COST.xlsx` (or a newer workbook with the same layout). The importer reads the `Master Herb` and `Powders` sheets locally in your browser, using their ingredient names, per-pound costs, and suppliers. It does not import the `Tincture Mixes` sheet as cost data.

- The preview shows every named row, matched ingredient, form, price, supplier, and any reason for skipping; only selected exact name/alias matches are applied.
- Missing or zero prices leave previous costs untouched. Missing suppliers, unmatched ingredients, ambiguous aliases, invalid prices, and conflicting duplicate entries are skipped for review.
- The supplied workbook contains no quote dates. Imported records are explicitly undated, with a separate system-recorded timestamp.
- Reimporting unchanged latest undated prices does not generate duplicate history. Changed prices preserve prior quotes.
- This import does not alter inventory counts, purchases, recipes, or unrelated workspace content. Export a private backup first and check the cloud Saved status afterward.
- The v4 Costs tab shows form-specific quoted prices, optional dates, suppliers, and historical records for manual quotes, imports, and actual receipt prices. v1/v2 legacy costs migrate as undated dry-herb quotes.

Never publish your private pricing workbook in the public repository.

## Account-based import (v2)

Sign in with Google, create/select the appropriate private **herbal** workspace, then open Settings and import the workbooks individually. XLSX parsing happens in the browser; only **after** the user confirms the reviewed draft are extracted records saved to that workspace's Firestore JSON document. Do not select a general inventory workspace for the specialized herbal XLSX importer. Always export a private JSON backup before bulk import and verify the cloud save status afterward.
