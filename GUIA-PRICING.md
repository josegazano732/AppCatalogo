# Gestion de precios desde PVP Consumidor Final

## Objetivo de la pantalla

La pantalla `#/administracion/precios` permite revisar los precios vigentes y definir nuevos margenes para las listas comerciales.

La lista marcada como `Fuente PVP` es la unica fuente del precio de venta al publico. Inicialmente es `PVP - Consumidor Final`. Al seleccionar una lista comercial, el sistema trae automaticamente el PVP de cada producto desde esa fuente y calcula el resto de los valores.

El calculador se muestra para:

- `Catalogo mayorista`.
- `Distribuidora por pallet`.
- `Comercios y puntos de venta`.

En estas listas, cada producto muestra junto a su categoria una referencia como `Yerba Mate · PVP: $2.800`. Ese importe se obtiene automaticamente de la lista marcada como `Fuente PVP` y no reemplaza el precio propio de la lista comercial.

`Catalogo WhatsApp`, `PVP - Consumidor Final` y `Lista Holowaty` mantienen su gestion normal de precios, pero no muestran el calculador comercial.

## Como se relacionan los productos

Cada producto puede tener una `Clave comercial` estable, por ejemplo `don-julian|500g|despalada`. Los productos equivalentes de todas las listas deben usar la misma clave. Esta asociacion tiene prioridad y no cambia aunque se edite el nombre del producto.

Para conservar compatibilidad con productos que todavia no tienen clave, el sistema busca el mismo producto comparando:

- Familia o marca, por ejemplo Don Julian, Mateite o Yerbella.
- Presentacion, por ejemplo 500 g o 1 kg.
- Variante, por ejemplo clasica, suave, tradicional, organica, terere o despalada.

Esto permite relacionar nombres escritos de forma diferente, como `10x500g` en una lista comercial y `x500` en la lista de consumidor final.

Al editar un producto existente, el formulario propone automaticamente su clave calculada. Al guardarlo, la clave queda persistida en Supabase. Para productos nuevos conviene copiar exactamente la clave del producto equivalente en la lista PVP.

Cuando encuentra la coincidencia, muestra el nombre usado como referencia debajo del producto. Si no encuentra una coincidencia, la fila queda marcada y muestra `Sin coincidencia en PVP Consumidor Final`.

## Columnas de la tabla

### Producto

Muestra el producto de la lista comercial seleccionada y el producto equivalente encontrado en `PVP - Consumidor Final`.

### PVP Consumidor Final

Es el precio final con IVA obtenido automaticamente desde `PVP - Consumidor Final`. Este valor es la base de todos los calculos posteriores.

### Precio actual lista

Es el precio vigente del producto en la lista seleccionada. Para un pack se muestra tambien el precio por unidad.

### Margen actual

Indica el margen que tiene hoy el comercio al vender al PVP definido. Se calcula comparando el PVP con el precio unitario actual de la lista:

```text
Margen actual (%) = (PVP Consumidor Final - precio unitario actual) / PVP Consumidor Final * 100
```

Ambos precios incluyen IVA, por lo que la proporcion del margen se conserva.

### Margen objetivo

Al cargar la pantalla comienza con el mismo porcentaje que el margen actual de cada producto. Se puede modificar individualmente para simular un margen nuevo.

Al cambiarlo, el precio propuesto se recalcula inmediatamente. El valor debe ser igual o mayor que `0` y menor que `100`.

### Precio propuesto

Es el precio que deberia tener la lista comercial para que el comercio alcance el margen objetivo:

```text
Precio unitario propuesto = PVP Consumidor Final * (1 - margen objetivo / 100)
```

En productos vendidos por pack, el sistema calcula primero el precio unitario y luego lo multiplica por la cantidad de unidades del pack.

### Aplicar precio

El boton con tilde aplica el precio propuesto de esa fila al editor de precios ubicado debajo. Todavia no lo guarda definitivamente.

## Controles generales

### Fuente PVP

La lista activa muestra la insignia `Fuente PVP`. Para cambiarla, seleccionar otra lista y presionar `Usar como PVP`. Solo puede existir una fuente activa y el cambio requiere permisos administrativos.

Al cambiar la fuente, los margenes y precios propuestos se vuelven a calcular desde los precios de esa lista.

### IVA de la lista

Define la alicuota usada por el calculador. El valor inicial es `21%`. Al cambiarlo se recalculan los precios propuestos.

### Margen para toda la lista

Permite ingresar un mismo margen objetivo para todos los productos. `Asignar a todos` copia ese porcentaje en cada fila y recalcula todos los precios propuestos.

### Guardar margen de lista

Guarda la regla general de margen para la lista seleccionada. No guarda los precios propuestos de los productos.

### Aplicar todos los precios propuestos

Copia todos los precios propuestos validos al editor de precios. Es un paso de preparacion: los cambios quedan pendientes para revisar.

## Como guardar cambios

1. Ingresar como administrador en `#/administracion/precios`.
2. Seleccionar una lista comercial en el menu lateral.
3. Revisar el PVP, precio actual y margen actual de cada producto.
4. Modificar el margen objetivo por producto o usar `Asignar a todos`.
5. Revisar los precios propuestos.
6. Aplicar una fila con el boton de tilde o usar `Aplicar todos los precios propuestos`.
7. Revisar los cambios pendientes en el editor inferior.
8. Presionar `Guardar cambios` para persistirlos.

`Descartar` elimina los cambios pendientes que todavia no fueron guardados.

## Persistencia

Los precios se guardan en Supabase cuando el esquema esta disponible. Si Supabase no esta disponible, la aplicacion conserva el comportamiento de respaldo local existente.

La migracion `supabase/migrations/202609040001_rename_retail_catalog.sql` actualiza el nombre de la lista publica existente a `PVP - Consumidor Final`.

La migracion `supabase/migrations/202609040002_scalable_product_pricing.sql` agrega las claves comerciales, configura una unica fuente PVP, rellena las claves de los productos actuales y habilita el cambio seguro de fuente desde administracion.

Si la migracion anterior ya fue ejecutada, `supabase/migrations/202609040003_repair_commercial_keys.sql` corrige las claves existentes de Yerbella y Mateite Premium.

La migracion `supabase/migrations/202609040004_sync_product_identity_from_pvp.sql` completa SKU y marca en las demas listas usando los datos de la fuente PVP. Los cambios posteriores de SKU o marca realizados en un producto PVP se propagan automaticamente a sus equivalentes con la misma clave comercial.

## Validacion tecnica

```powershell
npm test
npm run build
```