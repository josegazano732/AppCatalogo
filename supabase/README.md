# Configuracion de Supabase

## Crear el esquema y cargar los catalogos

1. Abre el proyecto en Supabase.
2. Entra en **SQL Editor** y crea una consulta nueva.
3. Copia el contenido de `supabase/setup.sql`.
4. Ejecuta la consulta completa.

El script es idempotente: puede ejecutarse nuevamente sin duplicar catalogos, productos ni precios.

## Habilitar un administrador

Despues de crear un usuario mediante Supabase Auth, ejecuta esta consulta reemplazando el correo:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where email = 'administrador@ejemplo.com'
on conflict (user_id) do nothing;
```

La lectura de catalogos y precios es publica. Las modificaciones requieren una sesion autenticada cuyo usuario exista en `admin_users`.

## Configurar Storage para PDFs

Para que el panel pueda subir y compartir PDFs de forma real, debes preparar Supabase Storage.

### 1) Crear el bucket

En Supabase Dashboard > Storage, crea un bucket llamado:

```text
catalog-pdfs
```

Marca el bucket como público.

### 2) Crear las políticas de Storage

Política para leer archivos:

```sql
create policy "Public can read catalog pdfs"
on storage.objects for select
to public
using (bucket_id = 'catalog-pdfs');
```

Política para insertar/actualizar desde usuarios autenticados:

```sql
create policy "Authenticated users can upload catalog pdfs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'catalog-pdfs');
```

Política para actualizar/borrar desde usuarios autenticados:

```sql
create policy "Authenticated users can update catalog pdfs"
on storage.objects for update
to authenticated
using (bucket_id = 'catalog-pdfs');
```

### 3) Crear la tabla de metadatos

Ejecuta el contenido de [supabase/storage-setup.sql](storage-setup.sql).

La tabla `catalog_documents` permite guardar multiples PDFs por cada catalogo.

Si ya tenias una version anterior que guardaba un solo PDF por catalogo, ejecuta tambien:

- `supabase/migrations/202607290004_catalog_documents_multi_pdf.sql`

### 4) Habilitar el acceso del admin

Si aun no lo hiciste, agrega el usuario a `public.admin_users`.

## Regenerar los datos iniciales

Cuando cambien los productos definidos en la aplicacion:

```powershell
npm run supabase:seed
```

El comando actualiza la migracion de seed y `supabase/setup.sql` desde `ProductService`.