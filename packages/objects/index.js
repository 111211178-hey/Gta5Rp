// SISTEMA SPAWNA OBJEKTOV

const CUSTOM_MODELS = {
    'bottle1': 'prop_lk_bottle_01',
    'bottle2': 'prop_lk_bottle_02',
    'bottle3': 'prop_lk_bottle_03',
    'burger': 'prop_lk_burger_01',
    'pizza': 'prop_lk_pizza_01',
    'can1': 'prop_lk_can_01',
    'can2': 'prop_lk_can_02',
    'can3': 'prop_lk_can_03',
    'test': 'prop_cs_burger_01'
};

mp.events.addCommand('spawn', (player, fullText) => {
    if (!player.adminLevel || player.adminLevel < 1) {
        player.outputChatBox('!{#f44336}Need admin rights!');
        return;
    }
    
    if (!fullText) {
        player.outputChatBox('!{#ffd700}=== MODELS ===');
        player.outputChatBox('!{#ffffff}/spawn burger, pizza, bottle1, can1');
        player.outputChatBox('!{#ffffff}/spawn test - GTA standard burger');
        player.outputChatBox('!{#ffffff}/spawn prop_cs_burger_01 - direct name');
        return;
    }
    
    var arg = fullText.trim().toLowerCase();
    var modelName = CUSTOM_MODELS[arg] || arg;
    
    var pos = player.position;
    
    // Спавним ПРЯМО ПЕРЕД игроком на уровне земли
    var spawnPos = new mp.Vector3(pos.x, pos.y + 1.0, pos.z);
    
    try {
        var obj = mp.objects.new(modelName, spawnPos, {
            rotation: new mp.Vector3(0, 0, 0),
            dimension: player.dimension
        });
        
        player.outputChatBox('!{#4caf50}Created: ' + modelName);
        player.outputChatBox('!{#9e9e9e}Pos: ' + spawnPos.x.toFixed(1) + ', ' + spawnPos.y.toFixed(1) + ', ' + spawnPos.z.toFixed(1));
        player.outputChatBox('!{#9e9e9e}ID: ' + obj.id);
        
        console.log('[Objects] ' + player.name + ' spawned ' + modelName + ' at ' + spawnPos.x.toFixed(1) + ', ' + spawnPos.y.toFixed(1) + ', ' + spawnPos.z.toFixed(1));
        
    } catch (err) {
        player.outputChatBox('!{#f44336}Error: ' + err.message);
        console.error('[Objects] Error:', err);
    }
});

mp.events.addCommand('delobj', (player) => {
    if (!player.adminLevel) return;
    
    var nearest = null;
    var minDist = 10;
    var pos = player.position;
    
    mp.objects.forEach(function(obj) {
        if (!obj || !obj.position) return;
        var dist = Math.sqrt(
            Math.pow(obj.position.x - pos.x, 2) +
            Math.pow(obj.position.y - pos.y, 2) +
            Math.pow(obj.position.z - pos.z, 2)
        );
        if (dist < minDist) {
            minDist = dist;
            nearest = obj;
        }
    });
    
    if (nearest) {
        nearest.destroy();
        player.outputChatBox('!{#4caf50}Deleted! Distance was: ' + minDist.toFixed(1) + 'm');
    } else {
        player.outputChatBox('!{#ff9800}No objects within 10m');
    }
});

mp.events.addCommand('objcount', (player) => {
    var count = 0;
    mp.objects.forEach(function() { count++; });
    player.outputChatBox('!{#2196f3}Total objects: ' + count);
});

console.log('[Objects] System loaded!');