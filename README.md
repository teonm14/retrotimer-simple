RetroControl

Plataforma web para la gestión de negocios tipo ciber / centro de Xbox.

Cómo abrir

Abre index.html en el navegador o usa Live Server en VS Code.

Funcionalidades actuales – Gestor de Tiempo





Añadir equipos (nombre + tipo: PC / XBOX / PLAYSTATION)



Tiempo Definido (temporizador): barra de progreso que disminuye, Agregar Tiempo, Cobrar, Cancelar



Tiempo Libre (cronómetro + límite): tiempo transcurrido + límite restante, Restar Tiempo, Cobrar, Cancelar



Configuración de precio (botón ⚙): monto por X minutos/horas



Cálculo automático al cobrar



Persistencia en localStorage (sobrevive al refrescar)

Estructura

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

Tecnologías

HTML5 · CSS3 · JavaScript (vanilla)