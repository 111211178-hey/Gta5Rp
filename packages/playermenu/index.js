// ===== МЕНЮ ИГРОКА - СЕРВЕР =====

const { db } = require('../database');

// ===== ОТКРЫТИЕ МЕНЮ =====
mp.events.add('playermenu:open', async (player) => {
    if (!player.characterId) return;
    
    try {
        // Получаем данные персонажа
        const [charData] = await db.query(`
            SELECT 
                c.*,
                u.registered_at,
                f.name as faction_name,
                f.id as faction_id,
                cf.rank as faction_rank,
                j.name as job_name,
                j.id as job_id,
                j.salary as job_salary
            FROM characters c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN character_factions cf ON c.id = cf.character_id
            LEFT JOIN factions f ON cf.faction_id = f.id
            LEFT JOIN character_jobs cj ON c.id = cj.character_id
            LEFT JOIN jobs j ON cj.job_id = j.id
            WHERE c.id = ?
        `, [player.characterId]);
        
        if (charData.length === 0) return;
        
        const char = charData[0];
        
        // Получаем время игры
        const [playTimeData] = await db.query(`
            SELECT COALESCE(SUM(duration), 0) as total_time
            FROM player_activity
            WHERE character_id = ?
        `, [player.characterId]);
        
        // Получаем навыки
        const [skillsData] = await db.query(`
            SELECT skill_id, level FROM character_skills WHERE character_id = ?
        `, [player.characterId]);
        
        // Получаем очки навыков
        const [pointsData] = await db.query(`
            SELECT skill_points FROM characters WHERE id = ?
        `, [player.characterId]);
        
        const playerData = {
            id: player.characterId,
            name: `${char.name} ${char.surname}`,
            level: char.level || 1,
            exp: char.exp || 0,
            age: char.age || 25,
            gender: char.gender || 'male',
            playTime: playTimeData[0]?.total_time || 0,
            regDate: char.registered_at ? new Date(char.registered_at).toLocaleDateString('ru-RU') : 'Неизвестно',
            faction: char.faction_name ? {
                id: char.faction_id,
                name: char.faction_name,
                rank: char.faction_rank || 'Рядовой'
            } : null,
            job: char.job_name ? {
                id: char.job_id,
                name: char.job_name,
                salary: char.job_salary || 0
            } : null,
            cash: char.money || 0,
            bank: char.bank || 0,
            skillPoints: pointsData[0]?.skill_points || 0
        };
        
        const skills = {};
        skillsData.forEach(s => {
            skills[s.skill_id] = s.level;
        });
        
        player.call('client:openPlayerMenu', [JSON.stringify(playerData), JSON.stringify(skills)]);
        
    } catch (err) {
        console.error('[PlayerMenu] Error:', err);
    }
});

// ===== УЛУЧШЕНИЕ НАВЫКА =====
mp.events.add('playermenu:upgradeSkill', async (player, skillId, cost) => {
    if (!player.characterId) return;
    
    try {
        // Проверяем очки навыков
        const [pointsData] = await db.query(
            'SELECT skill_points FROM characters WHERE id = ?',
            [player.characterId]
        );
        
        const currentPoints = pointsData[0]?.skill_points || 0;
        
        if (currentPoints < cost) {
            player.outputChatBox('!{#f44336}Недостаточно очков навыков!');
            return;
        }
        
        // Получаем текущий уровень навыка
        const [skillData] = await db.query(
            'SELECT level FROM character_skills WHERE character_id = ? AND skill_id = ?',
            [player.characterId, skillId]
        );
        
        let currentLevel = skillData[0]?.level || 0;
        
        if (currentLevel >= 5) {
            player.outputChatBox('!{#ff9800}Навык уже максимального уровня!');
            return;
        }
        
        // Улучшаем навык
        if (currentLevel === 0) {
            await db.query(
                'INSERT INTO character_skills (character_id, skill_id, level) VALUES (?, ?, 1)',
                [player.characterId, skillId]
            );
        } else {
            await db.query(
                'UPDATE character_skills SET level = level + 1 WHERE character_id = ? AND skill_id = ?',
                [player.characterId, skillId]
            );
        }
        
        // Снимаем очки навыков
        await db.query(
            'UPDATE characters SET skill_points = skill_points - ? WHERE id = ?',
            [cost, player.characterId]
        );
        
        const newLevel = currentLevel + 1;
        const remainingPoints = currentPoints - cost;
        
        player.call('client:skillUpgraded', [skillId, newLevel, remainingPoints]);
        
        console.log(`[PlayerMenu] ${player.name} улучшил навык ${skillId} до уровня ${newLevel}`);
        
    } catch (err) {
        console.error('[PlayerMenu] Ошибка улучшения навыка:', err);
    }
});

console.log('[PlayerMenu] ✅ Система меню игрока загружена!');