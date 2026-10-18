<div align="center">

# 🎮 RetroControl

**Administra tu ciber o centro de videojuegos desde una sola interfaz.**

Una aplicación web ligera para gestionar equipos, controlar sesiones de juego y calcular cobros de forma sencilla.

</div>

---

## 📌 Descripción

**RetroControl** está pensado para negocios tipo ciber y centros de Xbox o videojuegos. Permite registrar equipos y administrar sus sesiones mediante temporizadores o cronómetros, con cálculo automático del importe al momento de cobrar.

## ✨ Funcionalidades

- **Gestión de equipos:** añade equipos e identifica su tipo: PC, Xbox o PlayStation.
- **Tiempo definido:** inicia una sesión con duración establecida y consulta una barra de progreso que disminuye conforme pasa el tiempo.
- **Control de sesión:** agrega tiempo, cobra o cancela una sesión.
- **Tiempo libre:** registra el tiempo transcurrido y consulta el tiempo restante respecto al límite configurado.
- **Ajuste de tiempo:** permite restar tiempo en sesiones de tiempo libre.
- **Configuración de precios:** define una tarifa por cantidad de minutos u horas desde el botón de configuración ⚙️.
- **Cálculo automático:** calcula el importe al cobrar.
- **Guardado local:** conserva los datos almacenados en `localStorage`, incluso después de actualizar la página.

## 🚀 Cómo ejecutar el proyecto

No necesitas un proceso de compilación para abrir la aplicación.

1. Descarga o clona este repositorio.
2. Abre la carpeta del proyecto.
3. Abre `index.html` en tu navegador.

**Opción recomendada para desarrollo:** abre la carpeta en Visual Studio Code y ejecuta `index.html` con la extensión **Live Server**.

## 🗂️ Estructura del proyecto

```text
RetroControl/
├── index.html
├── pages/
│   └── tiempo.html
├── css/
│   ├── styles.css
│   └── tiempo.css
├── js/
│   ├── main.js
│   └── tiempo.js
├── assets/
└── README.md
```

## 🧰 Tecnologías

| Tecnología | Uso |
|---|---|
| **HTML5** | Estructura de la aplicación |
| **CSS3** | Estilos y presentación visual |
| **JavaScript (vanilla)** | Lógica e interactividad, sin frameworks |

## 💾 Almacenamiento

RetroControl utiliza `localStorage` del navegador para conservar los datos tras actualizar la página. Como el almacenamiento es local, los datos se guardan en el navegador y dispositivo donde se utiliza la aplicación.

## 🛠️ Estado del proyecto

El gestor de tiempo incluye las funciones descritas en este README. La estructura del proyecto está organizada en archivos HTML, CSS y JavaScript para facilitar su mantenimiento.

---

<div align="center">

Hecho para facilitar la administración diaria de un ciber o centro de videojuegos. 🎮

</div>
