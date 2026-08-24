// LedModule.h — 出力モジュールのサンプル（全ノード共通で使う想定なので common/lib に置く）
//
// 役割: SystemData の値を見て LED を点灯／消灯／点滅させる。
// 自分でセンサを読んだりしない = 「出力モジュール」なので updateOutput() だけを実装する。
//
// このモジュールが読むデータ（LedData）は各ノードの SystemData.h に置く。
// 依存の向きは「モジュール → SystemData」の一方向にする。
#pragma once

#include "IModule.h"
#include "ModuleTimer.h"
#include "SystemData.h"   // LedData の定義

// このモジュールの設定（ピン番号など）。
// 実際の値は各ノードの include/ProjectConfig.h で決める。
struct LedConfig {
    int pin;                    // LED を挿したピン番号
    unsigned long blinkMs;      // 点滅モードの周期(ms)
};

class LedModule : public IModule {
public:
    explicit LedModule(const LedConfig& config) : _config(config) {}

    bool init() override;
    void updateOutput(SystemData& data) override;

private:
    LedConfig   _config;
    ModuleTimer _timer;
    bool        _lit = false;
};
