# Player Import

Use this when player data already exists in an Excel sheet and you want the imported records to show payment status as `IMPORTED`.

## Input format

1. Save the Excel sheet as CSV.
2. Put the file at `data/player-import.csv`, or pass a custom path.
3. Supported headers:
   - `Name`
   - `Mobile Number` or `Mobile`
   - `Email`
   - `Village`
   - `Photo`
   - `Jersey Name` or `Jesrsey Name`
   - `Jersey Size` or `Jeysey Size`
   - `Jersey Number`
   - `Password` optional

## Notes

- If `Mobile Number` contains an email address, the importer treats it as email and also uses it as the stored `mobile` value when no separate mobile is present.
- Imported players are created with:
  - `payment_ref = 'IMPORTED'`
  - `fee_paid = 310`
  - `player_points = 0`
  - no assigned team
- If no password column is present, the importer uses `KMPL@123` by default.
  - Override with `KMPL_IMPORT_DEFAULT_PASSWORD`

## Command

```bash
npm run import:players -- data/player-import.csv
```

## Duplicate handling

Rows are skipped when an existing player already has the same mobile or email.
