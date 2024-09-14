document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("editor");
  const botonEjecutar = document.getElementById("ejecutar");
  const botonLimpiar = document.getElementById("limpiar");
  const botonGuardar = document.getElementById("guardar");
  const botonCargar = document.getElementById("cargar");
  const botonDescargar = document.getElementById("descargar");
  const botonNuevo = document.getElementById("nuevo");
  const divSalida = document.getElementById("salida");
  const interruptorTema = document.getElementById("interruptorTema");
  const entradaArchivo = document.getElementById("entradaArchivo");
  const botonDepurar = document.getElementById("depurar");

  const codigoBase = `program default;
begin
  // Aqui ingrese su codigo
end.`;
  editor.value = codigoBase;

  botonDepurar.addEventListener("click", () => {
    const codigo = editor.value.trim();
    if (codigo === "") {
      mostrarMensaje("Error: El editor esta vacio.", true);
      return;
    }
    try {
      const resultado = depurarPascal(codigo);
      mostrarMensaje(resultado);
    } catch (error) {
      mostrarMensaje(`Error: ${error.message}`, true);
    }
  });

  botonNuevo.addEventListener("click", () => {
    editor.value = codigoBase;
    mostrarMensaje("Nuevo archivo creado con formato base.");
  });

  interruptorTema.addEventListener("click", () => {
    document.body.classList.toggle("modo-oscuro");
    const mensajeActual = divSalida.textContent;
    mostrarMensaje(mensajeActual);
  });

  function mostrarMensaje(mensaje, esError = false) {
    const esModoOscuro = document.body.classList.contains("modo-oscuro");
    const colorTexto = esError ? "red" : esModoOscuro ? "white" : "black";
    divSalida.innerHTML = `<pre style="color: ${colorTexto};">${mensaje}</pre>`;
  }

  botonLimpiar.addEventListener("click", () => {
    editor.value = "";
    mostrarMensaje("");
  });

  botonGuardar.addEventListener("click", async () => {
    const codigo = editor.value;
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "codigo.pas",
        types: [
          {
            description: "Archivo Pascal",
            accept: { "text/plain": [".pas"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(codigo);
      await writable.close();
      mostrarMensaje("Archivo guardado exitosamente.");
    } catch (error) {
      mostrarMensaje(`Error al guardar el archivo: ${error.message}`, true);
    }
  });

  botonCargar.addEventListener("click", () => {
    entradaArchivo.accept = ".pas";
    entradaArchivo.click();
  });

  entradaArchivo.addEventListener("change", (event) => {
    const archivo = event.target.files[0];
    if (archivo) {
      const lector = new FileReader();
      lector.onload = (e) => {
        editor.value = e.target.result;
        mostrarMensaje("Archivo cargado exitosamente.");
      };
      lector.readAsText(archivo);
    }
  });

  botonDescargar.addEventListener("click", () => {
    const codigo = editor.value;
    const blob = new Blob([codigo], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codigo.pas";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarMensaje("Archivo descargado exitosamente.");
  });

  botonEjecutar.addEventListener("click", () => {
    const codigo = editor.value.trim();
    if (codigo === "") {
      mostrarMensaje("Error: El editor esta vacio.", true);
      return;
    }
    try {
      const resultado = ejecutarPascal(codigo);
      mostrarMensaje(resultado);
    } catch (error) {
      mostrarMensaje(`Error: ${error.message}`, true);
    }
  });

  function depurarPascal(codigo) {
    const palabrasClave = [
      "program",
      "begin",
      "var",
      "readln",
      "writeln",
      "end.",
    ];
    const lineas = codigo.split("\n");
    let enPrograma = false;
    let enDeclaracionVar = false;
    const pilaBegin = [];
    let variables = {};

    if (!lineas[0].trim().toLowerCase().startsWith("program")) {
      throw new Error('El programa debe comenzar con "program".');
    }

    for (let linea of lineas) {
      linea = linea.trim();
      if (linea === "") continue;

      const palabras = linea.toLowerCase().split(/\s+/);
      if (palabrasClave.includes(palabras[0])) {
        switch (palabras[0]) {
          case "program":
            if (enPrograma) throw new Error("Ya se ha declarado un programa.");
            enPrograma = true;
            break;
          case "var":
            if (!enPrograma)
              throw new Error('El programa debe comenzar con "program".');
            enDeclaracionVar = true;
            break;
          case "begin":
            if (!enPrograma)
              throw new Error('El programa debe comenzar con "program".');
            enDeclaracionVar = false;
            pilaBegin.push("begin");
            break;
          case "end.":
            if (pilaBegin.length === 0)
              throw new Error('No se ha declarado un bloque "begin".');
            pilaBegin.pop();
            break;
          case "writeln":
            if (pilaBegin.length === 0)
              throw new Error(
                `La declaracion "${palabras[0]}" debe estar dentro de un bloque "begin".`
              );
            if (!linea.endsWith(";")) {
              throw new Error(
                'La declaracion "writeln" debe terminar con ";".'
              );
            }
            const contenidoWriteln = linea.match(
              /writeln\s*\(\s*(.*?)\s*\)\s*;?/i
            );

            if (contenidoWriteln && contenidoWriteln[1]) {
              const partes = contenidoWriteln[1]
                .split(/,\s*|(['"].*?['"]|\w+)/)
                .filter(Boolean);
              partes.forEach((parte) => {
                parte = parte.trim();
                if (
                  !(parte.startsWith("'") || parte.startsWith('"')) &&
                  !(parte in variables)
                ) {
                  throw new Error(`Variable "${parte}" no declarada.`);
                }
              });
            }
            break;
          case "readln":
            if (pilaBegin.length === 0)
              throw new Error(
                `La declaracion "${palabras[0]}" debe estar dentro de un bloque "begin".`
              );
            if (!linea.endsWith(";")) {
              throw new Error('La declaracion "readln" debe terminar con ";".');
            }
            break;
          default:
            throw new Error(`Palabra clave no reconocida: ${palabras[0]}`);
        }
      } else {
        if (enDeclaracionVar) {
          const lineaVar = linea.split(":");
          const nombreVar = lineaVar[0].trim();
          if (nombreVar in variables) {
            throw new Error(`Variable "${nombreVar}" ya esta declarada.`);
          }
          variables[nombreVar] = null;
        } else {
          if (pilaBegin.length === 0)
            throw new Error(
              'El codigo debe estar dentro de un bloque "begin".'
            );

          // Validar operaciones matemáticas
          const operacionMatematica = linea.match(
            /(\w+)\s*:=\s*(\w+)\s*([\+\-\*\/])\s*(\w+)\s*;/
          );
          if (operacionMatematica) {
            const [_, varResultado, var1, operador, var2] = operacionMatematica;
            if (!(var1 in variables)) {
              throw new Error(`Variable "${var1}" no declarada.`);
            }
            if (!(var2 in variables)) {
              throw new Error(`Variable "${var2}" no declarada.`);
            }
            if (!(varResultado in variables)) {
              throw new Error(`Variable "${varResultado}" no declarada.`);
            }
          }
        }
      }
    }

    if (pilaBegin.length > 0)
      throw new Error('El programa debe terminar con "end.".');

    return "Depuracion completada. No se encontraron errores.";
  }

  function ejecutarPascal(codigo) {
    const palabrasClave = [
      "program",
      "begin",
      "var",
      "readln",
      "writeln",
      "end.",
    ];
    const lineas = codigo.split("\n");
    let enPrograma = false;
    let enDeclaracionVar = false;
    const pilaBegin = [];
    let salida = "";
    let variables = {};

    for (let linea of lineas) {
      linea = linea.trim();
      if (linea === "") continue;

      const palabras = linea.toLowerCase().split(/\s+/);
      if (palabrasClave.includes(palabras[0])) {
        switch (palabras[0]) {
          case "program":
            enPrograma = true;
            break;
          case "var":
            enDeclaracionVar = true;
            break;
          case "begin":
            enDeclaracionVar = false;
            pilaBegin.push("begin");
            break;
          case "end.":
            pilaBegin.pop();
            break;
          case "writeln":
            if (!linea.endsWith(";")) {
              continue;
            }
            const contenidoWriteln = linea.match(
              /writeln\s*\(\s*(.*?)\s*\)\s*;?/i
            );

            if (contenidoWriteln && contenidoWriteln[1]) {
              const partes = contenidoWriteln[1]
                .split(/,\s*|(['"].*?['"]|\w+)/)
                .filter(Boolean);
              let mensaje = "";
              partes.forEach((parte) => {
                parte = parte.trim();
                if (parte.startsWith("'") || parte.startsWith('"')) {
                  mensaje += parte.replace(/['"]+/g, "");
                } else if (variables[parte] !== undefined) {
                  mensaje += variables[parte];
                } else {
                  throw new Error(`Variable "${parte}" no declarada.`);
                }
              });
              salida += mensaje + "\n";
            }
            break;
          case "readln":
            if (!linea.endsWith(";")) {
              continue;
            }
            const varEntrada = linea.match(/readln\s*\(\s*(.*?)\s*\)\s*;?/i);
            if (varEntrada && varEntrada[1]) {
              const varALeer = varEntrada[1].trim();
              if (variables[varALeer] !== undefined) {
                const valorEntrada = prompt(
                  `Ingrese un valor para ${varALeer}:`
                );
                variables[varALeer] = parseFloat(valorEntrada);
              } else {
                throw new Error(`Variable "${varALeer}" no declarada.`);
              }
            }
            break;
          default:
            throw new Error(`Palabra clave no reconocida: ${palabras[0]}`);
        }
      } else {
        if (enDeclaracionVar) {
          const lineaVar = linea.split(":");
          const nombreVar = lineaVar[0].trim();
          if (nombreVar in variables) {
            throw new Error(`Variable "${nombreVar}" ya esta declarada.`);
          }
          variables[nombreVar] = 0; // Inicializar variables con valor 0
        } else {
          if (pilaBegin.length === 0)
            throw new Error(
              'El codigo debe estar dentro de un bloque "begin".'
            );

          // Ejecutar operaciones matemáticas
          const operacionMatematica = linea.match(
            /(\w+)\s*:=\s*(\w+)\s*([\+\-\*\/])\s*(\w+)\s*;/
          );
          if (operacionMatematica) {
            const [_, varResultado, var1, operador, var2] = operacionMatematica;
            if (!(var1 in variables)) {
              throw new Error(`Variable "${var1}" no declarada.`);
            }
            if (!(var2 in variables)) {
              throw new Error(`Variable "${var2}" no declarada.`);
            }
            if (!(varResultado in variables)) {
              throw new Error(`Variable "${varResultado}" no declarada.`);
            }

            let valor1 = parseFloat(variables[var1]);
            let valor2 = parseFloat(variables[var2]);

            if (isNaN(valor1)) {
              throw new Error(
                `Variable "${var1}" no tiene un valor numérico válido.`
              );
            }
            if (isNaN(valor2)) {
              throw new Error(
                `Variable "${var2}" no tiene un valor numérico válido.`
              );
            }

            let resultado;
            switch (operador) {
              case "+":
                resultado = valor1 + valor2;
                break;
              case "-":
                resultado = valor1 - valor2;
                break;
              case "*":
                resultado = valor1 * valor2;
                break;
              case "/":
                if (valor2 === 0) {
                  throw new Error("Division por cero.");
                }
                resultado = valor1 / valor2;
                break;
              default:
                throw new Error(`Operador no reconocido: ${operador}`);
            }
            variables[varResultado] = resultado;
          }
        }
      }
    }

    return salida + "Codigo Pascal ejecutado correctamente.";
  }
});
