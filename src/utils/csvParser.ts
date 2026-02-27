/**
 * CSV Parser for bulk shop uploads
 * Parses CSV file and validates each row against shop schema
 */

export interface CsvShopRow {
  shop_name: string;
  shop_description: string;
  address: string;
  address_second?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  latitude?: string | number;
  longitude?: string | number;
  phone?: string;
  website_url?: string;
  categories: string;
  chain_attestation: string;
  estimated_location_count: string;
  eligibility_confirmed: string;
}

export interface ParsedShopRow {
  rowNumber: number;
  data: CsvShopRow;
  isValid: boolean;
  errors: string[];
}

export interface CsvParseResult {
  validRows: ParsedShopRow[];
  invalidRows: ParsedShopRow[];
  totalRows: number;
}

/**
 * Parse CSV text into shop data rows
 */
export const parseCsvText = (csvText: string): CsvShopRow[] => {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    throw new Error(
      "CSV file must contain a header row and at least one data row",
    );
  }

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: CsvShopRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    rows.push(row as unknown as CsvShopRow);
  }

  return rows;
};

/**
 * Parse a single CSV line, handling quoted values with commas
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      // Escaped quote
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

/**
 * Validate a single shop row
 */
const validateShopRow = (row: CsvShopRow, rowNumber: number): ParsedShopRow => {
  const errors: string[] = [];

  // Check required fields (latitude/longitude now optional - will be geocoded if missing)
  const requiredFields: (keyof CsvShopRow)[] = [
    "shop_name",
    "shop_description",
    "address",
    "city",
    "state",
    "zip",
    "categories",
    "chain_attestation",
    "estimated_location_count",
    "eligibility_confirmed",
  ];

  requiredFields.forEach((field) => {
    if (!row[field] || String(row[field]).trim() === "") {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validate coordinates - only if they're present
  if (row.latitude && String(row.latitude).trim() !== "") {
    const lat = Number(row.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push("Invalid latitude (must be between -90 and 90)");
    }
  }

  if (row.longitude && String(row.longitude).trim() !== "") {
    const lng = Number(row.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push("Invalid longitude (must be between -180 and 180)");
    }
  }

  // Validate description length
  const desc = String(row.shop_description || "").trim();
  if (desc.length < 20) {
    errors.push("Description must be at least 20 characters");
  }
  if (desc.length > 250) {
    errors.push("Description must be at most 250 characters");
  }

  // Validate chain attestation
  const validChainValues = ["no", "yes", "unsure"];
  if (!validChainValues.includes(String(row.chain_attestation).toLowerCase())) {
    errors.push("chain_attestation must be: no, yes, or unsure");
  }

  // Validate estimated location count
  const validCountValues = ["lt10", "gte10", "unsure"];
  if (
    !validCountValues.includes(
      String(row.estimated_location_count).toLowerCase(),
    )
  ) {
    errors.push("estimated_location_count must be: lt10, gte10, or unsure");
  }

  // Validate eligibility confirmed
  const eligibility = String(row.eligibility_confirmed).toLowerCase();
  if (eligibility !== "true" && eligibility !== "false") {
    errors.push("eligibility_confirmed must be: true or false");
  }

  // Check for chain policy violation
  if (String(row.chain_attestation).toLowerCase() === "yes") {
    errors.push(
      "Chains/franchises not allowed (chain_attestation cannot be 'yes')",
    );
  }
  if (String(row.estimated_location_count).toLowerCase() === "gte10") {
    errors.push(
      "Brands with 10+ locations not allowed (estimated_location_count cannot be 'gte10')",
    );
  }

  // Validate state (2 letters)
  const state = String(row.state || "")
    .trim()
    .toUpperCase();
  if (state.length !== 2) {
    errors.push("State must be 2-letter code (e.g., CA, NY, TX)");
  }

  // Validate ZIP code
  const zip = String(row.zip || "").replace(/\D/g, "");
  if (zip.length !== 5 && zip.length !== 9) {
    errors.push("ZIP code must be 5 or 9 digits");
  }

  return {
    rowNumber,
    data: row,
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Parse and validate CSV file
 */
export const parseCsvFile = async (file: File): Promise<CsvParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCsvText(text);

        const parsedRows = rows.map(
          (row, index) => validateShopRow(row, index + 2), // +2 because row 1 is header, and we're 0-indexed
        );

        const validRows = parsedRows.filter((r) => r.isValid);
        const invalidRows = parsedRows.filter((r) => !r.isValid);

        resolve({
          validRows,
          invalidRows,
          totalRows: parsedRows.length,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read CSV file"));
    };

    reader.readAsText(file);
  });
};

/**
 * Generate CSV template for download
 */
export const generateCsvTemplate = (): string => {
  const headers = [
    "shop_name",
    "shop_description",
    "address",
    "address_second",
    "city",
    "state",
    "zip",
    "country",
    "latitude",
    "longitude",
    "phone",
    "website_url",
    "categories",
    "chain_attestation",
    "estimated_location_count",
    "eligibility_confirmed",
  ];

  const exampleRow = [
    "Joe's Sandwiches",
    "Amazing artisan sandwiches made fresh daily with local ingredients",
    "123 Main St",
    "",
    "Portland",
    "OR",
    "97201",
    "US",
    "", // latitude (optional - will be auto-geocoded)
    "", // longitude (optional - will be auto-geocoded)
    "(503) 555-0123",
    "https://joessandwiches.com",
    "Deli,Artisan",
    "no",
    "lt10",
    "true",
  ];

  return [
    headers.join(","),
    exampleRow.map((v) => (v.includes(",") ? `"${v}"` : v)).join(","),
  ].join("\n");
};

/**
 * Download CSV template file
 */
export const downloadCsvTemplate = () => {
  const template = generateCsvTemplate();
  const blob = new Blob([template], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "shop-upload-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
