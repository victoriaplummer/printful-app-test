import { PrintfulVariant, PrintfulProduct } from "./printful";

export interface WebflowProduct {
  id: string;
  name: string;
  slug: string;
  sku_properties: WebflowSkuProperty[];
  skus: WebflowSku[];
}

export interface WebflowSkuProperty {
  id: string;
  name: string;
  enum: WebflowSkuPropertyEnum[];
}

export interface WebflowSkuPropertyEnum {
  id: string;
  name: string;
  slug: string;
}

export interface WebflowSku {
  id: string;
  product_id: string;
  name: string;
  sku_values: Record<string, string>;
  price: {
    value: number;
    unit: string;
    display: string;
  };
  stock: {
    status: "in_stock" | "limited" | "out_of_stock" | "backordered";
    quantity: number;
  };
  printful_variant_id?: string; // For tracking the source
}

// Map a Printful variant to Webflow SKU properties
export const mapPrintfulVariantToSkuProperties = (
  variant: PrintfulVariant
): {
  properties: WebflowSkuProperty[];
  values: Record<string, string>;
} => {
  // We need to extract variant properties from the name and options
  // Example: "Small / Black" -> Size: Small, Color: Black
  const properties: WebflowSkuProperty[] = [];
  const values: Record<string, string> = {};

  // Using options if available
  if (variant.options && variant.options.length > 0) {
    variant.options.forEach((option) => {
      // Create property if needed
      const propertyId = `prop_${option.id.toLowerCase()}`;
      const propertyName = option.id;

      // Add to properties if not already there
      if (!properties.some((p) => p.id === propertyId)) {
        properties.push({
          id: propertyId,
          name: propertyName,
          enum: [
            {
              id: `enum_${option.value.toLowerCase().replace(/\s+/g, "-")}`,
              name: option.value,
              slug: option.value.toLowerCase().replace(/\s+/g, "-"),
            },
          ],
        });
      }

      // Add to values
      values[propertyId] = option.value;
    });
    return { properties, values };
  }

  // Fallback to parsing the name
  // This is an approximation - in a real app, more robust parsing would be needed
  const nameParts = variant.name.split(" / ");
  if (nameParts.length > 1) {
    // Assume 2 properties: Size and Color
    properties.push({
      id: "prop_size",
      name: "Size",
      enum: [
        {
          id: `enum_${nameParts[0].toLowerCase().replace(/\s+/g, "-")}`,
          name: nameParts[0],
          slug: nameParts[0].toLowerCase().replace(/\s+/g, "-"),
        },
      ],
    });

    properties.push({
      id: "prop_color",
      name: "Color",
      enum: [
        {
          id: `enum_${nameParts[1].toLowerCase().replace(/\s+/g, "-")}`,
          name: nameParts[1],
          slug: nameParts[1].toLowerCase().replace(/\s+/g, "-"),
        },
      ],
    });

    values["prop_size"] = nameParts[0];
    values["prop_color"] = nameParts[1];
  } else {
    // Single property
    properties.push({
      id: "prop_variant",
      name: "Variant",
      enum: [
        {
          id: `enum_${variant.name.toLowerCase().replace(/\s+/g, "-")}`,
          name: variant.name,
          slug: variant.name.toLowerCase().replace(/\s+/g, "-"),
        },
      ],
    });

    values["prop_variant"] = variant.name;
  }

  return { properties, values };
};

// Map a Printful product to a Webflow product
export const mapPrintfulProductToWebflow = (
  product: PrintfulProduct
): WebflowProduct => {
  // Create a list of all unique properties across all variants
  const allProperties: WebflowSkuProperty[] = [];
  const skus: WebflowSku[] = [];

  // Process each variant to build properties and SKUs
  product.variants.forEach((variant) => {
    const { properties, values } = mapPrintfulVariantToSkuProperties(variant);

    // Merge new properties with existing ones
    properties.forEach((prop) => {
      const existingProp = allProperties.find((p) => p.id === prop.id);
      if (!existingProp) {
        allProperties.push(prop);
      } else {
        // Merge enum values
        prop.enum.forEach((enumValue) => {
          if (!existingProp.enum.some((e) => e.id === enumValue.id)) {
            existingProp.enum.push(enumValue);
          }
        });
      }
    });

    // Create SKU
    skus.push({
      id: `sku_${variant.id}`,
      product_id: product.id,
      name: variant.name,
      sku_values: values,
      price: {
        value: parseFloat(variant.retail_price),
        unit: "USD",
        display: `$${variant.retail_price}`,
      },
      stock: {
        status: "in_stock",
        quantity: 100,
      },
      printful_variant_id: variant.id,
    });
  });

  return {
    id: `product_${product.id}`,
    name: product.name,
    slug: product.name.toLowerCase().replace(/\s+/g, "-"),
    sku_properties: allProperties,
    skus,
  };
};
