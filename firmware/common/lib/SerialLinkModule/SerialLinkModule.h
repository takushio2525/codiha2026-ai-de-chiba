// SerialLinkModule.h — 入力と出力の「両方」を持つモジュールのサンプル
//
// センサ（入力だけ）や LED（出力だけ）と違い、通信モジュールは
// 受信＝入力フェーズ、送信＝出力フェーズの両方に登場する。
// その場合は updateInput() と updateOutput() の両方を実装し、
// main.cpp の gInputs[] と gOutputs[] の両方に同じインスタンスを入れる。
//
// このサンプルは USB シリアルで
//   受信: 1 行のコマンド文字列を受け取る（例: "ON" / "OFF"）
//   送信: 一定周期で状態を 1 行送る
// をする。実際のプロジェクトでは Wi-Fi / BLE / I2C などに読み替える。
#pragma once

#include "IModule.h"
#include "ModuleTimer.h"
#include "SystemData.h"   // SerialLinkData と SERIAL_LINK_BUF_SIZE の定義

struct SerialLinkConfig {
    // 通信速度（Serial.begin）はこのモジュールでは設定しない。
    // Serial はデバッグ出力と共用する「共有資源」なので、I2C や SPI と同じく
    // main.cpp の setup() で開く。ここではモジュール固有の設定だけを持つ。
    unsigned long sendMs;       // 送信周期(ms)。0 なら周期送信しない
};

class SerialLinkModule : public IModule {
public:
    explicit SerialLinkModule(const SerialLinkConfig& config) : _config(config) {}

    bool init() override;
    void updateInput(SystemData& data) override;    // 受信
    void updateOutput(SystemData& data) override;   // 送信

private:
    SerialLinkConfig _config;
    ModuleTimer      _sendTimer;
    char             _buf[SERIAL_LINK_BUF_SIZE] = {0};
    int              _len = 0;
};
