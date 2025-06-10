document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("interpolation-form");
  const resultado = document.getElementById("resultado");
  const tablaBody = document.querySelector("#tablaResultados tbody");
  const ctx = document.getElementById("grafico").getContext("2d");

  let grafico = null;

  const cleanInputData = (input) => {
    const data = input.split(",")
      .map(item => item.trim())
      .filter(item => item !== "")
      .map(Number);

    if (data.some(isNaN)) {
      throw new Error("Todos los valores deben ser numéricos y separados por comas.");
    }
    return data;
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    try {
      const dias = cleanInputData(document.getElementById("dias").value);
      const alturas = cleanInputData(document.getElementById("alturas").value);
      const xEstimar = parseFloat(document.getElementById("valorEstimado").value);

      if (dias.length === 0 || alturas.length === 0) {
        throw new Error("Por favor ingresa valores para días y alturas");
      }

      if (dias.length !== alturas.length) {
        throw new Error("El número de días y alturas debe coincidir");
      }

      if (isNaN(xEstimar)) {
        throw new Error("Ingresa un día válido para estimar");
      }

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

      const resultadoFinal = newtonInterpolacion(dias, alturas, xEstimar);

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

      // Generar tabla y puntos para el gráfico desde min hasta max
      const minX = Math.min(...dias);
      const maxX = Math.max(...dias);
      const step = 0.1;
      const puntosX = [];
      const puntosY = [];

      tablaBody.innerHTML = "";
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
        tablaBody.appendChild(fila);
      }

      if (grafico) {
        grafico.destroy();
      }

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
              font: {
                size: 16
              }
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
