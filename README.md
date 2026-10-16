# whatis

> 本模组是 Mindustry 辅助模组 **WAISA**（by [deltanedas](https://github.com/deltanedas/waisa)，GPL-3.0）的**重制版**。
> 在原版基础上改为**独立构建（不再依赖 ui-lib）**、**界面中文化**，并精简了信息面板。

## 这个模组做了什么

**whatis**（What Am I Shooting At）是一个轻量的 HUD 辅助模组：当你开火时，它会在屏幕左下角弹出一个可拖拽的信息面板，实时显示你当前锁定目标的详情，帮你快速判断「这枪在打谁、还值不值得打」。

锁定的目标可以是**敌方单位**，也可以是**敌方建筑**（炮塔等）。面板会显示：

- 目标名称（按阵营着色）与图标
- 血量
- 弹药（炮塔建筑 / 携带武器的单位）
- 护盾与护甲（有护盾的单位）
- 坐标（建筑为瓦片坐标，单位为像素坐标取整）

主要特性：

- 仅在**开火（按住攻击）**时锁定鼠标附近 **16 格**内最近的敌方目标
- 信息面板**可拖拽**；打开小地图时自动隐藏
- **纯 JavaScript** 实现，无需编译、无外部依赖
- 兼容 **v7 / v8**（需要 `minGameVersion` ≥ 154）

## 安装

1. 下载本仓库的 `whatis.zip`，或直接将 `mod.json` 与 `scripts/` 放入模组文件夹。
2. 把模组放进 Mindustry 的 `mods` 目录，或在游戏内 **Mods** 菜单中导入。
3. 重启游戏 / 重载存档后生效。

## 兼容性

- 游戏版本 ≥ 154（v7 / v8）
- Mindustry 内置的 Rhino 引擎较旧，仅支持 ES5 语法，本模组代码据此编写。

## 致谢

- 基于 [deltanedas/waisa](https://github.com/deltanedas/waisa)（GPL-3.0）修改而来。
- 版权所有 (c) DeltaNedas 2020，以 GNU GPL v3 许可发布。

## 许可

GNU GPL v3.0 —— 详见 `COPYING`。
