import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const workspaceRoot = process.cwd();
const sourcePath = path.join(workspaceRoot, 'src', 'app', 'services', 'product.service.ts');
const outputPath = path.join(workspaceRoot, 'supabase', 'migrations', '202607150002_catalog_seed.sql');
const schemaPath = path.join(workspaceRoot, 'supabase', 'migrations', '202607150001_catalog_schema.sql');
const adminAllowlistPath = path.join(workspaceRoot, 'supabase', 'migrations', '202607150003_admin_allowlist.sql');
const setupPath = path.join(workspaceRoot, 'supabase', 'setup.sql');
const sourceText = fs.readFileSync(sourcePath, 'utf8');
const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true);

function evaluateNode(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }

  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }

  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    return -Number(evaluateNode(node.operand));
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map(evaluateNode);
  }

  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.map((property) => {
      if (!ts.isPropertyAssignment(property)) {
        throw new Error(`Unsupported object property: ${property.getText(sourceFile)}`);
      }

      const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
        ? property.name.text
        : property.name.getText(sourceFile);
      return [name, evaluateNode(property.initializer)];
    }));
  }

  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) {
    return evaluateNode(node.expression);
  }

  throw new Error(`Unsupported syntax: ${node.getText(sourceFile)}`);
}

function readClassProperty(propertyName) {
  let value;

  sourceFile.forEachChild((node) => {
    if (!ts.isClassDeclaration(node) || node.name?.text !== 'ProductService') {
      return;
    }

    const property = node.members.find((member) => (
      ts.isPropertyDeclaration(member)
      && ts.isIdentifier(member.name)
      && member.name.text === propertyName
    ));

    if (property?.initializer) {
      value = evaluateNode(property.initializer);
    }
  });

  if (value === undefined) {
    throw new Error(`Property not found: ${propertyName}`);
  }

  return value;
}

const baseProducts = readClassProperty('baseProducts');
const commerceExtras = readClassProperty('commercePosExtraProducts');
const wholesaleProducts = readClassProperty('wholesaleCatalogProducts');
const retailProducts = readClassProperty('retailCatalogProducts');
const holowatyProducts = readClassProperty('holowatyCatalogProducts');
const distributorPrices = readClassProperty('distributorPackPrices');
const holowatyListPrices = readClassProperty('holowatyListPrices');

const catalogs = {
  whatsapp: baseProducts,
  'commerce-pos': [...baseProducts, ...commerceExtras],
  'distributor-pallet': baseProducts.map((product) => ({
    ...product,
    price: distributorPrices[product.id] ?? product.price,
    wholesale_price: distributorPrices[product.id] ?? product.wholesale_price
  })),
  wholesale: wholesaleProducts,
  retail: retailProducts,
  holowaty: holowatyProducts.map((product) => ({
    ...product,
    list_price: holowatyListPrices[product.name] ?? product.list_price ?? product.wholesale_price ?? product.price
  }))
};

const productMap = new Map();
Object.values(catalogs).flat().forEach((product) => {
  if (!productMap.has(product.id)) {
    const {
      id,
      name,
      description = '',
      category_name = null,
      image = null,
      unit_of_measure = null,
      sku = null,
      brand = null,
      stock = 0,
      price: _price,
      wholesale_price: _wholesalePrice,
      list_price: _listPrice,
      ...metadata
    } = product;

    productMap.set(id, {
      id,
      name,
      description,
      category_name,
      image,
      unit_of_measure,
      sku,
      brand,
      stock,
      metadata
    });
  }
});

const prices = Object.entries(catalogs).flatMap(([catalogId, products]) => (
  products.map((product, sortOrder) => ({
    catalog_id: catalogId,
    product_id: product.id,
    price: catalogId === 'holowaty'
      ? product.list_price
      : product.wholesale_price ?? product.price,
    sort_order: sortOrder,
    is_active: true
  }))
));

const productsJson = JSON.stringify([...productMap.values()], null, 2);
const pricesJson = JSON.stringify(prices, null, 2);
const sql = `begin;

with seed_products as (
  select *
  from jsonb_to_recordset($seed_products$${productsJson}$seed_products$::jsonb) as item (
    id text,
    name text,
    description text,
    category_name text,
    image text,
    unit_of_measure text,
    sku text,
    brand text,
    stock numeric,
    metadata jsonb
  )
)
insert into public.products (
  id,
  name,
  description,
  category_name,
  image,
  unit_of_measure,
  sku,
  brand,
  stock,
  metadata
)
select
  id,
  name,
  description,
  category_name,
  image,
  unit_of_measure,
  sku,
  brand,
  stock,
  metadata
from seed_products
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category_name = excluded.category_name,
  image = excluded.image,
  unit_of_measure = excluded.unit_of_measure,
  sku = excluded.sku,
  brand = excluded.brand,
  stock = excluded.stock,
  metadata = excluded.metadata;

with seed_prices as (
  select *
  from jsonb_to_recordset($seed_prices$${pricesJson}$seed_prices$::jsonb) as item (
    catalog_id text,
    product_id text,
    price numeric,
    sort_order integer,
    is_active boolean
  )
)
insert into public.catalog_prices (
  catalog_id,
  product_id,
  price,
  sort_order,
  is_active
)
select
  catalog_id,
  product_id,
  price,
  sort_order,
  is_active
from seed_prices
on conflict (catalog_id, product_id) do update set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

commit;
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, sql, 'utf8');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
const adminAllowlistSql = fs.readFileSync(adminAllowlistPath, 'utf8');
fs.writeFileSync(setupPath, `${schemaSql.trim()}\n\n${sql.trim()}\n\n${adminAllowlistSql}`, 'utf8');
console.log(`Generated ${path.relative(workspaceRoot, outputPath)} with ${productMap.size} products and ${prices.length} catalog prices.`);
console.log(`Generated ${path.relative(workspaceRoot, setupPath)} for one-step installation.`);