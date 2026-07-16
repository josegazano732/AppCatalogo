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

## Regenerar los datos iniciales

Cuando cambien los productos definidos en la aplicacion:

```powershell
npm run supabase:seed
```

El comando actualiza la migracion de seed y `supabase/setup.sql` desde `ProductService`.