// ButtonModule.h — 入力モジュールのサンプル（このノード固有なので node_01/lib に置く）
//
// 役割: ボタンの状態を読んで SystemData に書き込む。
// 出力は持たない = 「入力モジュール」なので updateInput() だけを実装する。
//
// 【置き場所の使い分け】
//   このノードでしか使わない  → node_XX/lib/   （このファイル）
//   全ノードで共通に使う      → common/lib/     （LedModule がその例）
//
// このモジュールが読み書きするデータ（ButtonData）は SystemData.h に置く。
// 依存の向きは「モジュール → SystemData」の一方向にする。
#pragma once

#include "IModule.h"
#include "SystemData.h"   // ButtonData の定義

struct ButtonConfig {
    int  pin;           // ボタンを挿したピン番号
    bool activeLow;     // 押したとき LOW になる配線なら true（INPUT_PULLUP 使用時）
};

class ButtonModule : public IModule {
public:
    explicit ButtonModule(const ButtonConfig& config) : _config(config) {}

    bool init() override;
    void updateInput(SystemData& data) override;

private:
    ButtonConfig _config;
    bool         _prevPressed = false;
};
