document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("interpolation-form");
  const resultado = document.getElementById("resultado");
  const tablaBody = document.querySelector("#tablaResultados tbody");
  const graficoCanvas = document.getElementById("grafico");
  let grafico;

  // Función de interpolación de Lagrange
  function interpolarLagrange(x, y, xi) {
    let yi = 0;
    const n = x.length;

    for (let i = 0; i < n; i++) {
      let term = y[i];
      for (let j = 0; j < n; j++) {
        if (j !== i) {
          term *= (xi - x[j]) / (x[i] - x[j]);
        }
      }
      yi += term;
    }

    return yi;
  }

  // Generar datos interpolados
  function generarDatosInterpolados(x, y, limite) {
    const datos = [];
    const paso = 0.5;
    
    // Asegurarse de que el límite no exceda las 24 horas
    const maxHora = Math.min(limite, 24);
    
    for (let xi = x[0]; xi <= maxHora; xi += paso) {
      datos.push({ 
        x: xi, 
        y: interpolarLagrange(x, y, xi),
        horaFormateada: formatearHora(xi)
      });
    }
    
    return datos;
  }

  // Formatear hora para mostrar en formato HH:MM
  function formatearHora(horaDecimal) {
    const horas = Math.floor(horaDecimal);
    const minutos = Math.round((horaDecimal - horas) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }

  // Obtener estado de la temperatura
  function obtenerEstadoTemperatura(temp) {
    if (temp < 10) return {text: "Muy frío", icon: "bi-snow", color: "muy-frio"};
    if (temp < 15) return {text: "Frío", icon: "bi-cloud-snow", color: "frio"};
    if (temp < 22) return {text: "Templado", icon: "bi-cloud-sun", color: "templado"};
    if (temp < 28) return {text: "Cálido", icon: "bi-sun", color: "calido"};
    return {text: "Caluroso", icon: "bi-thermometer-sun", color: "caluroso"};
  }

  // Actualizar tabla con los resultados
  function actualizarTabla(datos) {
    if (datos.length === 0) {
      tablaBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No hay datos disponibles</td></tr>`;
      return;
    }

    tablaBody.innerHTML = "";
    datos.forEach((dato) => {
      const estado = obtenerEstadoTemperatura(dato.y);
      const fila = `
        <tr>
          <td>${dato.horaFormateada}</td>
          <td class="fw-bold">${dato.y.toFixed(1)} °C</td>
          <td>
            <span class="badge bg-${estado.color} badge-temperature">
              <i class="bi ${estado.icon} me-1"></i>${estado.text}
            </span>
          </td>
        </tr>`;
      tablaBody.insertAdjacentHTML("beforeend", fila);
    });
  }

  // Actualizar gráfico con los resultados
  function actualizarGrafico(datos, horaEstimada) {
    const labels = datos.map(d => d.horaFormateada);
    const values = datos.map(d => d.y);
    
    // Configurar colores basados en temperatura
    const backgroundColors = values.map(temp => {
      return temp > 28 ? 'rgba(220, 53, 69, 0.7)' : 
             temp > 22 ? 'rgba(255, 193, 7, 0.7)' : 
             temp > 18 ? 'rgba(25, 135, 84, 0.7)' : 
             'rgba(13, 110, 253, 0.7)';
    });

    const borderColors = values.map(temp => {
      return temp > 28 ? 'rgba(220, 53, 69, 1)' : 
             temp > 22 ? 'rgba(255, 193, 7, 1)' : 
             temp > 18 ? 'rgba(25, 135, 84, 1)' : 
             'rgba(13, 110, 253, 1)';
    });

    // Destruir gráfico anterior si existe
    if (grafico) grafico.destroy();

    // Crear nuevo gráfico
    grafico = new Chart(graficoCanvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Temperatura (°C)",
          data: values,
          fill: true,
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          borderColor: 'rgba(220, 53, 69, 1)',
          borderWidth: 2,
          tension: 0.4,
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
                return `Temperatura: ${context.parsed.y.toFixed(1)} °C`;
              }
            }
          },
          annotation: horaEstimada ? {
            annotations: {
              lineaHoraEstimada: {
                type: 'line',
                xMin: formatearHora(horaEstimada),
                xMax: formatearHora(horaEstimada),
                borderColor: 'rgba(220, 53, 69, 0.8)',
                borderWidth: 2,
                borderDash: [6, 6],
                label: {
                  content: `Hora estimada (${formatearHora(horaEstimada)})`,
                  enabled: true,
                  position: 'top'
                }
              }
            }
          } : {}
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: "Hora del día",
              font: {
                weight: 'bold'
              }
            },
            grid: {
              display: false
            }
          },
          y: { 
            title: { 
              display: true, 
              text: "Temperatura (°C)",
              font: {
                weight: 'bold'
              }
            },
            suggestedMin: Math.min(...values) - 2,
            suggestedMax: Math.max(...values) + 2
          }
        }
      }
    });
  }

  // Manejar el envío del formulario
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Obtener datos del formulario
    const x = document.getElementById("horas").value.split(",").map(Number);
    const y = document.getElementById("temperaturas").value.split(",").map(Number);
    const xi = parseFloat(document.getElementById("horaEstimada").value);

    // Validar datos
    if (x.length !== y.length || x.length === 0) {
      mostrarError("Los arreglos de datos no coinciden o están vacíos.");
      return;
    }

    if (xi < 0 || xi > 24) {
      mostrarError("La hora estimada debe estar entre 0 y 24.");
      return;
    }

    // Validar que las horas estén en rango
    if (x.some(hora => hora < 0 || hora > 24)) {
      mostrarError("Las horas deben estar entre 0 y 24.");
      return;
    }

    // Calcular interpolación
    const yi = interpolarLagrange(x, y, xi);
    const estado = obtenerEstadoTemperatura(yi);
    
    // Mostrar resultado
    resultado.innerHTML = `
      <div class="d-flex align-items-center">
        <span class="badge bg-primary rounded-pill me-2">${formatearHora(xi)}</span>
        <span class="fw-bold me-2">Temperatura estimada:</span> 
        <span class="fw-bold text-${estado.color}">${yi.toFixed(1)} °C</span>
        <i class="bi ${estado.icon} ms-2 text-${estado.color}"></i>
        <span class="ms-2">${estado.text}</span>
      </div>
    `;

    // Generar y mostrar datos interpolados
    const datos = generarDatosInterpolados(x, y, Math.max(...x));
    actualizarTabla(datos);
    actualizarGrafico(datos, xi);
  });

  // Función para mostrar errores
  function mostrarError(mensaje) {
    resultado.innerHTML = `
      <div class="text-danger">
        <i class="bi bi-exclamation-triangle-fill"></i> ${mensaje}
      </div>
    `;
    tablaBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No hay datos disponibles</td></tr>`;
    if (grafico) grafico.destroy();
  }
});