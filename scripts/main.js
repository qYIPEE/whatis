/*
 * WhatIs —— 显示被锁定敌人/建筑的信息（血量、弹药、护盾、坐标等）
 * 独立版：内联 ui-lib 兼容层，无外部依赖；界面中文化。
 *
 * 基于 deltanedas/waisa (GPL-3.0) 修改。
 * 版权所有 (c) DeltaNedas 2020，以 GNU GPL v3 许可发布。
 *
 * 注意：Mindustry 内置 Rhino 引擎较旧，不支持 for...of、const/let、
 * 箭头函数与模板字符串，本文件仅使用 ES5 语法。
 */

// ---------------------------------------------------------------------------
// ui-lib 兼容层（全部内联，不依赖任何外部库）
// ---------------------------------------------------------------------------

var loaded = [];
var clientLoaded = false;

/* 输出错误日志，并尽量弹窗提示（UI 崩溃默认只写 stdout，不易察觉） */
function showError(msg, error) {
	if (error) {
		msg += ": " + (error.message || error) +
			(error.fileName ? "\n" + error.fileName + ": " + error.lineNumber : "");
	}
	Log.err(msg);
	try {
		if (Vars.ui && Vars.ui.showErrorMessage) Vars.ui.showErrorMessage(msg);
	} catch (e) {
		/* 忽略 */
	}
}

/* 若客户端已加载则立即执行，否则排队等待 */
function onLoad(fn) {
	if (clientLoaded) {
		fn();
	} else {
		loaded.push(fn);
	}
}

Events.on(ClientLoadEvent, function() {
	clientLoaded = true;
	// 传统循环：Rhino 不支持 for...of
	for (var i = 0; i < loaded.length; i++) {
		try {
			loaded[i]();
		} catch (e) {
			showError("whatis 初始化失败", e);
		}
	}
	loaded.length = 0;
});

// ---------------------------------------------------------------------------
// 目标查询（兼容 v7 / v8 的 Units 包路径变化）
// ---------------------------------------------------------------------------

function findClosestTarget(team, x, y, range) {
	// 优先用引擎自带方法（能同时处理单位与建筑）
	try {
		if (typeof Units !== "undefined" && Units.closestTarget) {
			return Units.closestTarget(team, x, y, range);
		}
	} catch (e) {
		/* 继续走下面的手动扫描 */
	}

	// 兜底：手动遍历所有存活单位
	try {
		var best = null;
		var bestDst = range * range * Vars.tilesize * Vars.tilesize;
		for (var i = 0; i < Groups.unit.size; i++) {
			var other = Groups.unit.get(i);
			if (!other || !other.isValid() || other.team() === team) continue;
			var dx = other.x - x, dy = other.y - y;
			var dst = dx * dx + dy * dy;
			if (dst < bestDst) {
				bestDst = dst;
				best = other;
			}
		}
		return best;
	} catch (e2) {
		showError("whatis 无法搜索目标", e2);
		return null;
	}
}

// ---------------------------------------------------------------------------
// 面板状态
// ---------------------------------------------------------------------------

var target = null, lastTarget = null;
var display = null;

// ---------------------------------------------------------------------------
// 面板内容构建
// ---------------------------------------------------------------------------

function updateTarget(enemy) {
	// display 还没创建时直接返回，避免空指针
	if (!display) return;
	display.clear();
	if (!enemy) return;

	var block = enemy instanceof Building ? enemy.block : null;
	var unit = enemy instanceof Unit ? enemy.type : null;
	var player = (unit && enemy.isPlayer()) ? enemy.controller : null;
	var icon = block ? block.uiIcon : enemy.icon();

	/* 顶部：图标 + 名称（按阵营着色） */
	var info = display.table().get();
	info.image(icon).size(36);
	info.add("[#" + enemy.team.color + "]" + (block ? block.localizedName :
		player ? player.name : unit.localizedName)).padLeft(5);
	display.row();

	/* 血量 */
	display.add(new Bar(
		function() { return "血量: " + Math.floor(enemy.health); },
		function() { return Pal.health; },
		function() { return enemy.healthf(); })).size(160, 20);
	display.row();

	if (block) {
		if (enemy instanceof Turret.TurretBuild) {
			// 建筑（炮塔）弹药
			var max = enemy.block.maxAmmo;
			display.add(new Bar(
				function() { return "弹药: " + enemy.totalAmmo; },
				function() { return Pal.ammo; },
				function() { return enemy.totalAmmo / max; })).size(160, 20);
			display.row();
		}

		display.add("坐标: " + enemy.tile.x + ", " + enemy.tile.y);
	} else {
		// 单位弹药
		if (enemy instanceof Weaponsc) {
			display.add(new Bar(
				function() { return "弹药: " + enemy.ammo; },
				function() { return Pal.ammo; },
				function() { return enemy.ammof(); })).size(160, 20);
			display.row();
		}

		if (enemy instanceof Shieldc) {
			display.label(function() {
				return "护盾: " + Math.floor(enemy.shield);
			});
			display.row();
			display.add("护甲: " + Math.floor(enemy.armor) + "%");
			display.row();
		}

		display.label(function() {
			return "坐标: " + Math.round(enemy.x / Vars.tilesize)
				+ ", " + Math.round(enemy.y / Vars.tilesize);
		});
	}
}

// ---------------------------------------------------------------------------
// 面板构建（放在左下角）
// ---------------------------------------------------------------------------

onLoad(function() {
	var table = new Table();
	table.left();
	table.defaults().left();
	// 半透明黑色面板背景（参考 coreItems 的样式）
	table.background(Styles.black3);
	table.margin(4);

	// 有存活目标时才显示
	table.visibility = function() {
		return !!target && target.health > 0;
	};

	// 小地图打开时隐藏
	table.update(function() {
		if (Vars.ui && Vars.ui.minimapfrag) {
			table.visible = !Vars.ui.minimapfrag.shown();
		}
	});

	display = table;

	// 挂到一个铺满屏幕的容器里，容器负责整体定位
	Vars.ui.hudGroup.fill(cons(function(container) {
		container.left().name = "whatis/info";
		container.add(table);

		// 可拖拽：完全采用参考模组（coreItems）验证过的写法。
		//
		// 监听器必须加在铺满屏幕的 container 上，而不是内层 table——
		// 因为 table 里的血条、图标等子元素会先消费掉触摸事件，
		// 加在 table 上收不到 touchDown。
		container.addListener(extend(InputListener, {
			lastx: 0,
			lasty: 0,

			touchDown: function(event, x, y, pointer, button) {
				var v = container.localToParentCoordinates(Tmp.v1.set(x, y));
				this.lastx = v.x;
				this.lasty = v.y;
				return true;
			},

			touchDragged: function(event, x, y, pointer) {
				var v = container.localToParentCoordinates(Tmp.v1.set(x, y));
				container.translation.add(v.x - this.lastx, v.y - this.lasty);
				this.lastx = v.x;
				this.lasty = v.y;
			}
		}));
	}));
});

// ---------------------------------------------------------------------------
// 目标锁定（开火时）
// ---------------------------------------------------------------------------

Events.on(WorldLoadEvent, function() {
	target = null;
	lastTarget = null;
});

function check() {
	if (target != lastTarget) {
		updateTarget(target);
	}
	lastTarget = target;
}

// 开火时锁定目标，保留上次信息直到锁定新目标
Events.run(Trigger.update, function() {
	var p = Vars.player;
	if (!p || !p.shooting) return;

	var found = findClosestTarget(p.team(), p.mouseX, p.mouseY, 16);
	if (found) {
		target = found;
		check();
	}
});
