const http = require('http');
http.createServer((req, res) => {
  res.write('Bot Aternos Activo 24/7');
  res.end();
}).listen(process.env.PORT || 3000);

const mineflayer = require('mineflayer');

// CONFIGURACIÓN DE TU SERVIDOR
const HOST = 'ZocredMS.aternos.me'; 
const PORT = 62905;                    // Verifica si Aternos mantiene este puerto
const BOT_USERNAME = 'GuardianAFK';      

function iniciarBot() {
  console.log('--------------------------------------------------');
  console.log('Iniciando y conectando bot a Aternos...');

  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: BOT_USERNAME,
    version: false 
  });

  // Función para pausar la ejecución en milisegundos
  const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Función exhaustiva para probar TODOS los cofres uno por uno
  async function inspeccionarTodosLosCofres() {
    console.log('\n[INSPECTOR] Buscando todos los cofres en un radio de 5 bloques...');

    const cofresPosiciones = bot.findBlocks({
      matching: block => block.type === bot.registry.blocksByName.chest.id || block.type === bot.registry.blocksByName.trapped_chest.id,
      maxDistance: 5,
      count: 10
    });

    if (cofresPosiciones.length === 0) {
      console.log('[INSPECTOR] ❌ No se encontraron cofres cargados alrededor del bot.');
      return;
    }

    console.log(`[INSPECTOR] Se encontraron ${cofresPosiciones.length} cofre(s). Probándolos uno por uno...\n`);

    for (let i = 0; i < cofresPosiciones.length; i++) {
      const pos = cofresPosiciones[i];
      const bloqueCofre = bot.blockAt(pos);

      console.log(`--------------------------------------------------`);
      console.log(`[PROBANDO COFRE ${i + 1}/${cofresPosiciones.length}] Coordenadas: X:${pos.x} Y:${pos.y} Z:${pos.z}`);

      try {
        // Mirar hacia el cofre
        await bot.lookAt(pos.offset(0.5, 0.5, 0.5));
        
        // Esperar 2 segundos antes de dar clic
        await esperar(2000);

        console.log(`[INSPECTOR] Abriendo cofre ${i + 1}...`);
        const cofre = await bot.openContainer(bloqueCofre);

        console.log(`[INSPECTOR] Cofre abierto con éxito. Esperando 5 segundos a que sincronicen los ítems...`);
        await esperar(5000);

        const items = cofre.containerItems();
        console.log(`[INSPECTOR] Slots ocupados detectados: ${items.length}`);

        if (items.length > 0) {
          console.log(`\n¡ÉXITO! Se encontró contenido en el Cofre #${i + 1}. Contando durante 20 segundos...`);

          let totalIngots = 0;
          let totalBlocks = 0;
          let totalNuggets = 0;
          let totalRaw = 0;

          items.forEach(item => {
            console.log(`  └─ Objeto: ${item.name} x${item.count}`);
            if (item.name.includes('iron_ingot')) totalIngots += item.count;
            if (item.name.includes('iron_block')) totalBlocks += item.count;
            if (item.name.includes('iron_nugget')) totalNuggets += item.count;
            if (item.name.includes('raw_iron')) totalRaw += item.count;
          });

          const lingotesTotales = totalIngots + (totalBlocks * 9) + Math.floor(totalNuggets / 9) + totalRaw;

          console.log('\n==================================================');
          console.log('        📊 REPORTE DE HIERRO ENCONTRADO           ');
          console.log('==================================================');
          console.log(` 🔹 Lingotes de Hierro: ${totalIngots}`);
          console.log(` 🔹 Bloques de Hierro : ${totalBlocks} (${totalBlocks * 9} lingotes)`);
          console.log(` 🔹 Hierro Bruto     : ${totalRaw}`);
          console.log(` 🔹 Pepitas de Hierro: ${totalNuggets}`);
          console.log('--------------------------------------------------');
          console.log(` ⚡ TOTAL EQUIVALENTE EN LINGOTES: ${lingotesTotales}`);
          console.log('==================================================\n');

          // Mantener el cofre abierto durante 20 segundos como pediste
          await esperar(20000);
          cofre.close();
          console.log(`[INSPECTOR] Cofre cerrado. Inspección completada.`);
          return; // Detener la búsqueda tras encontrar el cofre con cosas

        } else {
          console.log(`[INSPECTOR] El Cofre #${i + 1} está vacío. Cerrando y probando el siguiente...`);
          cofre.close();
        }

      } catch (err) {
        console.log(`[INSPECTOR] ❌ No se pudo abrir el Cofre #${i + 1}: ${err.message}`);
      }

      // Pausa de 10 segundos antes de intentar con el siguiente cofre
      console.log(`Esperando 10 segundos antes de probar el siguiente cofre...`);
      await esperar(10000);
    }

    console.log('\n[INSPECTOR] Se revisaron todos los cofres cercanos y ninguno tenía ítems o no se pudieron abrir.');
  }

  // Evento al aparecer en el servidor
  bot.on('spawn', async () => {
    console.log(`¡El bot ${BOT_USERNAME} ha entrado al servidor!`);
    console.log(`Esperando 15 segundos a que la zona y los bloques carguen completamente...`);

    // Esperar 15 segundos iniciales tras conectar
    await esperar(15000);

    // Iniciar la inspección pausada de todos los cofres
    inspeccionarTodosLosCofres();

    // Salto anti-AFK cada 40 segundos
    setInterval(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }, 40000);

    // Repetir la revisión completa cada 10 minutos
    setInterval(() => {
      inspeccionarTodosLosCofres();
    }, 600000);
  });

  bot.on('death', () => {
    console.log('El bot ha muerto. Reapareciendo en 5 segundos...');
    setTimeout(() => {
      bot.chat('/respawn');
    }, 5000);
  });

  bot.on('end', () => {
    console.log('El bot se ha desconectado. Reintentando en 15 segundos...');
    setTimeout(iniciarBot, 15000);
  });

  bot.on('error', (err) => {
    console.log('Error detectado:', err.message);
  });
}

iniciarBot();
