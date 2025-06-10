document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("interpolation-form");
  const resultado = document.getElementById("resultado");
  const tablaBody = document.querySelector("#tablaResultados tbody");
  const graficoCanvas = document.getElementById("grafico");
  let grafico;

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
      datos.push({ x: xi, y: yi });
    }

    return { datos, splines };
  }

  function actualizarTabla(datos) {
    tablaBody.innerHTML = "";
    datos.forEach((dato) => {
      const estado = "Interpolado";
      tablaBody.insertAdjacentHTML("beforeend",
        `<tr>
          <td>${dato.x.toFixed(2)}</td>
          <td>${dato.y.toFixed(2)}</td>
          <td>${estado}</td>
        </tr>`);
    });
  }

  function actualizarGrafico(datos) {
    const labels = datos.map((d) => d.x.toFixed(2));
    const values = datos.map((d) => d.y.toFixed(2));

    if (grafico) grafico.destroy();

    grafico = new Chart(graficoCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Temperatura estimada (°C)",
          data: values,
          fill: false,
          borderColor: "#0d6efd",
          tension: 0.3,
          pointRadius: 3,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: { title: { display: true, text: "Hora" } },
          y: { title: { display: true, text: "Temperatura (°C)" } }
        }
      }
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const x = document.getElementById("horas").value.split(",").map(Number);
    const y = document.getElementById("temperaturas").value.split(",").map(Number);
    const xi = parseFloat(document.getElementById("horaEstimada").value);

    if (x.length !== y.length || x.length < 3) {
      alert("Verifica que ambos vectores tengan al menos 3 valores y coincidan en longitud.");
      return;
    }

    const { datos, splines } = generarDatosInterpolados(x, y, xi);
    const yi = evaluarSpline(splines, xi);

    resultado.innerHTML = `<i class="fas fa-thermometer-half me-2"></i>
      A las <strong>${xi.toFixed(2)} h</strong>, la temperatura estimada es 
      <strong>${yi.toFixed(2)} °C</strong> usando Spline Cúbico.`;

    actualizarTabla(datos);
    actualizarGrafico(datos);
  });
});
