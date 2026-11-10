# Volets & Soleil — sol y persianas

Para cada fachada de su casa, esta integración indica si el sol le da y **cuánto cerrar las persianas** para
mantener la casa fresca en verano, o dejar entrar el sol en invierno. Todo se calcula localmente a partir de la
posición del sol: sin cuenta, sin acceso a Internet, sin API.

La integración nunca mueve una persiana por sí misma: lo hacen sus escenas, con los valores que publica.

_Desarrollada sin persianas conectadas a un Gladys de prueba: sus comentarios son bienvenidos en el foro._

## Lo que obtiene

Un dispositivo por fachada, con:

- **Sol en la fachada** (sí / no): el sol está por encima del umbral y delante del muro;
- **Cierre aconsejado** (0-100 %), detallado más abajo;
- **Insolación directa** (0-100 %): la parte de la fuerza del sol que golpea el muro, `100 × cos θ`, sea cual
  sea la estación;
- **Ángulo de incidencia del sol** (°): 0° cuando el sol está frente al muro, 90° con luz rasante, o cuando el
  sol no está en la fachada;
- **Próxima llegada del sol** y **Próxima salida del sol**, en hora local (`14:32`, `mañana 07:12`), en las
  próximas 48 horas.

Todo se recalcula cada minuto; solo se envían a Gladys los valores que cambian.

**El cierre aconsejado.** Con θ el ángulo entre los rayos del sol y la fachada, y `h` la altura del sol:

`cierre = 100 × cos θ × min(1, h / 15°)`, redondeado al 10 % más cercano.

Una fachada oeste a las 19 h en julio (sol bajo y de frente) obtiene 90 %; una fachada sur a mediodía (sol alto,
rayos casi paralelos al muro) 40 %; el segundo factor suaviza los primeros minutos de un sol bajo, todavía débil.
**En invierno, el consejo es siempre 0 %**: abierto, para que el sol caliente la casa. Los escalones de 10 %
evitan mover las persianas cada minuto.

## Configuración

- **Ubicación**: las coordenadas de su casa en Gladys (**Ajustes → Casas**). La integración pide permiso para
  leerlas al instalarla. Sin ellas, muestra un error y vuelve a comprobar cada 10 minutos.
- **Idioma de los nombres y textos**: el idioma de los nombres de los dispositivos y de los textos enviados a
  Gladys.
- **Estación**: _Automático (meses)_ sigue los meses de verano elegidos (un rango que cruza el año nuevo
  funciona, para el hemisferio sur); _Siempre verano_ o _Siempre invierno_. La integración no puede leer su
  termómetro por sí misma: para seguir la temperatura exterior, use la acción de escena **Imponer la estación**
  (ver más abajo).
- **Elevación mínima del sol**: por debajo de esta altura sobre el horizonte, el sol se ignora (5° por defecto).
- **Fachadas 1 a 6**: indique la **orientación** de cada fachada, la dirección hacia la que miran sus ventanas:
  grados desde el norte, en sentido horario (90 = este, 180 = sur, 270 = oeste), o un punto cardinal (N, NE, E,
  SE, S, SO, O, NO, y NNE, ENE…); `W` también vale oeste. Una orientación vacía ignora la posición. Opcional:
  - **Nombre**: el nombre del dispositivo (si no, «Fachada S»);
  - **Campo de visión**: 180° para un muro plano, menos cuando huecos profundos o muros laterales ocultan el sol
    antes;
  - **Máscara de horizonte**: la elevación oculta por una colina, un edificio o un balcón frente a la fachada.

Consejo: una aplicación de mapas da la orientación de sus muros; una fachada sur-suroeste está a unos 200°.

## Acciones

- **Ver el consejo ahora**: la estación vigente y el consejo de cada fachada, para comprobar las orientaciones.

## Escenas

**Disparador «El sol llega a una fachada»**: elija la fachada y el momento: a la llegada, 15 min, 30 min o 1 hora
antes. Variables: la fachada, la hora de llegada, los minutos antes de la llegada, el **cierre aconsejado
máximo** del periodo soleado que empieza, y la estación (`summer` o `winter`).

Ejemplos:

- _Bajar las persianas del salón antes del sol_: disparador «El sol llega a una fachada», Salón, 30 min antes →
  condición: la variable estación vale `summer` → ajustar la posición de las persianas.
- _Cerrar más cuando pega fuerte_: disparador sobre el **Cierre aconsejado** del dispositivo fachada por encima
  de 70 % → ajustar la posición de las persianas a 30 % (en Gladys, la posición de una persiana cuenta la
  apertura).
- _Volver a abrir cuando el sol se va_: disparador sobre **Sol en la fachada** que pasa a «no» → abrir las
  persianas.

**Acción «Imponer la estación»**: verano, invierno, o volver a la configuración. Por ejemplo una escena «cada día
a las 10 h, si la temperatura exterior supera 25 °C → Imponer la estación: verano». La elección se conserva tras
un reinicio. Salida: la estación vigente.

## Panel

El widget **Sol en las fachadas** lista cada fachada con su cierre aconsejado y la próxima hora del sol, la
estación vigente, y tres botones para imponer la estación (el activo lleva una marca). Sus ajustes ocultan la
línea de estación o los botones.

## Límites y solución de problemas

- «Ninguna ubicación de casa»: indique las coordenadas de la casa en **Ajustes → Casas**; se usa la primera casa
  que las tenga.
- «Orientación de fachada ilegible»: corrija la orientación de las posiciones citadas en el mensaje (grados o
  puntos cardinales).
- El modelo es geométrico: ni nubes, ni meteorología. Los árboles y los vecinos se aproximan con la elevación
  mínima y la máscara de horizonte.
- Las horas siguen la zona horaria de Gladys. Un periodo soleado de menos de 5 minutos puede pasarse por alto.
- Registros: el contenedor solo escribe su ciclo de vida; `LOG_LEVEL=debug` muestra cada cálculo.
