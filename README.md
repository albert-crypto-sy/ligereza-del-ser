# Levedad

Una pieza web generativa sobre la ligereza del ser y el pensamiento abstracto.
En vivo: https://pruebas.somfylabs.cloud

Cuatro escenas dibujadas en `<canvas>`, sin dependencias ni paso de build:

1. **Levedad**: un campo de flujo de ruido de Perlin; el cursor crea un remolino en el aire.
2. **Peso**: semillas de diente de león. El control deslizante cambia el peso del mundo entre flotar y caer; un toque suelta más semillas.
3. **Pensamiento abstracto**: una constelación de ideas que se atraen por afinidad, con pulsos que viajan entre ellas. Un clic siembra una idea nueva.
4. **Respirar**: un armonógrafo que se dibuja lentamente junto a un círculo que respira.

## Local

```sh
python3 -m http.server 8000
```

## Despliegue

En el VPS (Ubuntu con nginx y certbot), como root:

```sh
curl -fsSL https://raw.githubusercontent.com/albert-crypto-sy/ligereza-del-ser/main/deploy/deploy.sh | bash
```

El script clona o actualiza el repo en `/opt/ligereza-del-ser`, copia los archivos a
`/var/www/pruebas.somfylabs.cloud`, instala el bloque de nginx y pide el certificado HTTPS.
