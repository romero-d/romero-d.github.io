document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("interpolation-form");
  const resultado = document.getElementById("resultado");
  const tablaBody = document.querySelector("#tablaResultados tbody");
  const graficoCanvas = document.getElementById("grafico");
  const dataTable = document.getElementById("data-table");
  const addRowBtn = document.getElementById("add-row");
  let grafico;

  // Función para agregar filas a la tabla de entrada
  function addRow() {
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
      <td><input type="number" class="form-control time-input" step="1" required></td>
      <td><input type="number" class="form-control reading-input" step="1" required></td>
      <td><button type="button" class="btn btn-warning btn-sm remove-row"><i class="fas fa-trash"></i></button></td>
    `;
    dataTable.querySelector("tbody").appendChild(newRow);
    
    // Agregar evento al botón de eliminar
    newRow.querySelector(".remove-row").addEventListener("click", function() {
      if (dataTable.querySelectorAll("tbody tr").length > 1) {
        newRow.remove();
      } else {
        alert("Debe haber al menos una fila de datos");
      }
    });
  }

  // Evento para agregar filas
  addRowBtn.addEventListener("click", addRow);

  // Evento para eliminar filas (delegado)
  dataTable.addEventListener("click", function(e) {
    if (e.target.classList.contains("remove-row") || e.target.closest(".remove-row")) {
      const row = e.target.closest("tr");
      if (dataTable.querySelectorAll("tbody tr").length > 1) {
        row.remove();
      } else {
        alert("Debe haber al menos una fila de datos");
      }
    }
  });

  // Algoritmo de Spline Cúbico
  function calcularSplines(x, y) {
    const n = x.length;
    const a = y.slice();
    const b = new Array(n - 1).fill(0);
    const d = new Array(n - 1).fill(0);
    const h = new Array(n - 1);
    const alpha = new Array(n - 1);
    const c = new Array(n).fill(0);
    const l = new Array(n).fill(1);
    const mu = new Array(n).fill(0);
    const z = new Array(n).fill(0);

    for (let i = 0; i < n - 1; i++) {
      h[i] = x[i + 1] - x[i];
    }

    for (let i = 1; i < n - 1; i++) {
      alpha[i] = (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);
    }

    for (let i = 1; i < n - 1; i++) {
      l[i] = 2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1];
      mu[i] = h[i] / l[i];
      z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
    }

    for (let j = n - 2; j >= 0; j--) {
      c[j] = z[j] - mu[j] * c[j + 1];
      b[j] = (a[j + 1] - a[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
      d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    }

    return x.slice(0, n - 1).map((xj, i) => ({
      a: a[i], b: b[i], c: c[i], d: d[i], x: xj
    }));
  }

  function evaluarSpline(splines, xi) {
    const s = splines.findLast(s => xi >= s.x);
    if (!s) return NaN;
    const dx = xi - s.x;
    return s.a + s.b * dx + s.c * dx ** 2 + s.d * dx ** 3;
  }

  function generarDatosInterpolados(x, y, limite) {
    const splines = calcularSplines(x, y);
    const datos = [];
    const paso = 0.5;

    for (let xi = x[0]; xi <= limite; xi += paso) {
      const yi = evaluarSpline(splines, xi);
      datos.push({ 
        x: xi, 
        y: yi,
        tipo: x.includes(xi) ? "Original" : "Interpolado"
      });
    }

    return { datos, splines };
  }

  function actualizarTabla(datos) {
    tablaBody.innerHTML = "";
    datos.forEach((dato) => {
      const fila = `
        <tr>
          <td>${dato.x.toFixed(2)}</td>
          <td>${dato.y.toFixed(2)}</td>
          <td>
            <span class="badge ${dato.tipo === 'Original' ? 'bg-primary' : 'bg-success'}">
              ${dato.tipo}
            </span>
          </td>
        </tr>`;
      tablaBody.insertAdjacentHTML("beforeend", fila);
    });
  }

  function actualizarGrafico(datos) {
    const labels = datos.map(d => d.x.toFixed(2));
    const values = datos.map(d => d.y);
    const tipos = datos.map(d => d.tipo);

    // Configurar colores basados en el tipo de dato
    const backgroundColors = tipos.map(t => 
      t === 'Original' ? 'rgba(13, 110, 253, 0.7)' : 'rgba(25, 135, 84, 0.7)');
    const borderColors = tipos.map(t => 
      t === 'Original' ? 'rgba(13, 110, 253, 1)' : 'rgba(25, 135, 84, 1)');

    if (grafico) grafico.destroy();

    grafico = new Chart(graficoCanvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Lecturas del sensor",
          data: values,
          fill: false,
          borderColor: "#ffc107",
          backgroundColor: backgroundColors,
          borderWidth: 2,
          tension: 0.3,
          pointBackgroundColor: backgroundColors,
          pointBorderColor: borderColors,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            display: true,
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Valor: ${context.parsed.y.toFixed(2)} (${datos[context.dataIndex].tipo})`;
              }
            }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: "Tiempo (horas)",
              font: { weight: 'bold' }
            },
            grid: { display: false }
          },
          y: { 
            title: { 
              display: true, 
              text: "Lectura del sensor",
              font: { weight: 'bold' }
            }
          }
        }
      }
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Obtener datos de la tabla
    const rows = dataTable.querySelectorAll("tbody tr");
    const x = [];
    const y = [];
    
    rows.forEach(row => {
      const timeInput = row.querySelector(".time-input");
      const readingInput = row.querySelector(".reading-input");
      
      if (timeInput.value && readingInput.value) {
        x.push(parseFloat(timeInput.value));
        y.push(parseFloat(readingInput.value));
      }
    });

    const xi = parseFloat(document.getElementById("horaEstimada").value);

    // Validar datos
    if (x.length < 3) {
      mostrarError("Se necesitan al menos 3 puntos de datos para la interpolación por splines cúbicos.");
      return;
    }

    // Verificar que los tiempos estén en orden
    for (let i = 1; i < x.length; i++) {
      if (x[i] <= x[i-1]) {
        mostrarError("Los tiempos deben estar en orden ascendente y no pueden repetirse.");
        return;
      }
    }

    const { datos, splines } = generarDatosInterpolados(x, y, Math.max(xi, ...x));
    const yi = evaluarSpline(splines, xi);

    resultado.innerHTML = `
      <div class="d-flex align-items-center">
        <span class="badge bg-warning rounded-pill me-2">${xi.toFixed(2)} h</span>
        <span class="fw-bold me-2">Lectura estimada:</span> 
        <span class="fw-bold text-success">${yi.toFixed(2)}</span>
        <i class="fas fa-check-circle ms-2 text-success"></i>
      </div>
      <div class="mt-2">
        <small class="text-muted">Usando interpolación por splines cúbicos con ${x.length} puntos de referencia.</small>
      </div>
    `;

    actualizarTabla(datos);
    actualizarGrafico(datos);
  });

  function mostrarError(mensaje) {
    resultado.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i> ${mensaje}
      </div>
    `;
    tablaBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No hay datos disponibles</td></tr>`;
    if (grafico) grafico.destroy();
  }

  // Agregar 3 filas iniciales por defecto
  addRow();
  addRow();
});