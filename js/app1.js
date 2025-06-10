document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("interpolation-form");
  const calcularBtn = document.getElementById("calcularBtn");
  const resultado = document.getElementById("resultado");
  const tablaResultadosBody = document.querySelector("#tablaResultados tbody");
  const tablaDatos = document.getElementById("tablaDatos").querySelector("tbody");
  const ctx = document.getElementById("grafico").getContext("2d");

  let grafico = null;

  // Agregar nueva fila a la tabla
  document.getElementById("agregarFila").addEventListener("click", () => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td><input type="number" class="form-control" placeholder="Día" /></td>
      <td><input type="number" class="form-control" placeholder="Altura" /></td>
      <td><button type="button" class="btn btn-danger btn-sm eliminar-fila"><i class="fas fa-trash"></i></button></td>
    `;
    tablaDatos.appendChild(fila);
  });

  // Eliminar fila
  tablaDatos.addEventListener("click", (e) => {
    if (e.target.closest(".eliminar-fila")) {
      e.target.closest("tr").remove();
    }
  });

  // Obtener los datos de la tabla
  function obtenerDatosDeTabla() {
    const filas = tablaDatos.querySelectorAll("tr");
    const x = [];
    const y = [];

    filas.forEach(fila => {
      const inputs = fila.querySelectorAll("input");
      const xi = parseFloat(inputs[0].value);
      const yi = parseFloat(inputs[1].value);

      if (!isNaN(xi) && !isNaN(yi)) {
        x.push(xi);
        y.push(yi);
      }
    });

    if (x.length === 0 || y.length === 0) {
      throw new Error("Debes ingresar al menos un par de valores (x, y).");
    }

    if (x.length !== y.length) {
      throw new Error("El número de días y alturas debe coincidir.");
    }

    return [x, y];
  }

  // Diferencias divididas
  function diferenciasDivididas(x, y) {
    const n = x.length;
    const coef = y.slice();

    for (let j = 1; j < n; j++) {
      for (let i = n - 1; i >= j; i--) {
        coef[i] = (coef[i] - coef[i - 1]) / (x[i] - x[i - j]);
      }
    }

    return coef;
  }

  // Interpolación de Newton
  function newtonInterpolacion(x, y, xEstimar) {
    const coef = diferenciasDivididas(x, y);
    let resultado = coef[0];
    let producto = 1;

    for (let i = 1; i < coef.length; i++) {
      producto *= (xEstimar - x[i - 1]);
      resultado += coef[i] * producto;
    }

    return resultado;
  }

  // Evento principal
  calcularBtn.addEventListener("click", (e) => {
    e.preventDefault();

    try {
      const [dias, alturas] = obtenerDatosDeTabla();
      const xEstimar = parseFloat(document.getElementById("valorEstimado").value);

      if (isNaN(xEstimar)) {
        throw new Error("Ingresa un valor válido para el día a estimar.");
      }

      const resultadoFinal = newtonInterpolacion(dias, alturas, xEstimar);

      // Mostrar resultado
      resultado.innerHTML = `
        <div class="d-flex align-items-center">
          <i class="fas fa-check-circle fa-2x me-3"></i>
          <div>
            <h5 class="mb-1">Resultado de la interpolación</h5>
            <p class="mb-0">La altura estimada para el día <strong>${xEstimar}</strong> es de 
            <strong class="text-success">${resultadoFinal.toFixed(2)} cm</strong></p>
          </div>
        </div>
      `;
      resultado.className = "alert alert-success";

      // Generar tabla de resultados y puntos para el gráfico
      const minX = Math.min(...dias);
      const maxX = Math.max(...dias);
      const step = 0.1;
      const puntosX = [];
      const puntosY = [];

      tablaResultadosBody.innerHTML = "";
      for (let x = minX; x <= maxX; x += step) {
        const y = newtonInterpolacion(dias, alturas, x);
        const xRounded = parseFloat(x.toFixed(2));
        const yRounded = parseFloat(y.toFixed(2));
        puntosX.push(xRounded);
        puntosY.push(yRounded);

        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>${xRounded}</td>
          <td class="fw-bold">${yRounded} cm</td>
        `;
        tablaResultadosBody.appendChild(fila);
      }

      if (grafico) grafico.destroy();

      grafico = new Chart(ctx, {
        type: "line",
        data: {
          labels: puntosX,
          datasets: [
            {
              label: "Altura estimada (cm)",
              data: puntosY,
              borderColor: "rgba(40, 167, 69, 1)",
              backgroundColor: "rgba(40, 167, 69, 0.1)",
              borderWidth: 3,
              pointBackgroundColor: "rgba(40, 167, 69, 1)",
              pointRadius: 3,
              fill: true,
              tension: 0.3
            },
            {
              label: "Datos conocidos",
              data: dias.map((dia, i) => ({ x: dia, y: alturas[i] })),
              borderColor: "rgba(13, 110, 253, 1)",
              backgroundColor: "rgba(13, 110, 253, 1)",
              borderWidth: 0,
              pointRadius: 6,
              pointHoverRadius: 8,
              type: "scatter"
            },
            {
              label: "Punto estimado",
              data: [{ x: xEstimar, y: resultadoFinal }],
              backgroundColor: "orange",
              borderColor: "orange",
              borderWidth: 0,
              pointRadius: 7,
              pointHoverRadius: 10,
              type: "scatter"
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: "Crecimiento estimado de la planta",
              font: { size: 16 }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} cm`;
                }
              }
            },
            legend: {
              position: "top",
              labels: {
                boxWidth: 12,
                padding: 20,
                usePointStyle: true,
                pointStyle: "circle"
              }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: "Días",
                font: { weight: "bold" }
              },
              grid: { display: false }
            },
            y: {
              title: {
                display: true,
                text: "Altura (cm)",
                font: { weight: "bold" }
              },
              beginAtZero: true
            }
          },
          animation: {
            duration: 1500
          }
        }
      });

    } catch (error) {
      resultado.innerHTML = `
        <div class="d-flex align-items-center">
          <i class="fas fa-exclamation-triangle fa-2x me-3"></i>
          <div>
            <h5 class="mb-1">Error en los datos</h5>
            <p class="mb-0">${error.message}</p>
          </div>
        </div>
      `;
      resultado.className = "alert alert-danger";

      if (grafico) {
        grafico.destroy();
        grafico = null;
      }
    }
  });
});
