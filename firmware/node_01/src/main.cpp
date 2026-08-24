// main.cpp — node_01 のエントリーポイント
//
// EMA（Embedded Module Architecture）の 3 フェーズ実行モデルで書いてある。
//   ① 入力フェーズ : センサ・通信から SystemData に取り込む
//   ② ロジック     : SystemData だけを見て状態を決める
//   ③ 出力フェーズ : SystemData を LED・通信に反映する
//
// このサンプルは 3 種類のモジュールの書き方を 1 ファイルで見せるためのもの。
//   ButtonModule     … 入力だけを持つモジュール
//   LedModule        … 出力だけを持つモジュール
//   SerialLinkModule … 入力と出力の両方を持つモジュール（通信はたいていこれ）
//
// 動作:
//   ボタンを押している間 LED が点滅し、長押しすると点灯に変わる。
//   PC から "ON" / "OFF" を送ると LED を直接操作できる。
//   100ms ごとに "STATUS,<値>" を PC へ送る。
//
// EMA の詳しい解説: https://github.com/takushio2525/Embedded-Module-Architecture
#include <Arduino.h>
#include <string.h>

#include "SystemData.h"
#include "ProjectConfig.h"

namespace {

// ===== このノードが持つ状態とモジュール =====
SystemData       gData;
ButtonModule     gButton(BUTTON_CONFIG);
LedModule        gLed(LED_CONFIG);
SerialLinkModule gLink(SERIAL_LINK_CONFIG);

// ===== 実行順を配列で決める（並び順 = 呼ばれる順） =====
// 入力を持つモジュールを入れる
IModule* gInputs[] = { &gLink, &gButton };
// 出力を持つモジュールを入れる
// gLink は入力にも出力にも登場する（受信は入力フェーズ、送信は出力フェーズ）
IModule* gOutputs[] = { &gLed, &gLink };

// 押しっぱなしの長さを数えるカウンタ。
// モジュールに属さない「ロジックだけが使う状態」はここに置く。
int gPressedLoops = 0;

// ===== ② ロジックフェーズ =====
// ここには「入力から出力を決めるルール」だけを書く。
// ハードウェアを直接触らない（触るのはモジュールの仕事）ので、
// この関数だけを読めばシステムの振る舞いが分かる状態を保つ。
void applyPattern(SystemData& data) {
    // 押している長さを数える
    gPressedLoops = data.button.pressed ? gPressedLoops + 1 : 0;

    // 押していない → 消灯 / 押している → 点滅 / 長押し → 点灯
    if (!data.button.pressed) {
        data.led.mode = LedData::OFF;
    } else if (gPressedLoops >= LONG_PRESS_LOOPS) {
        data.led.mode = LedData::ON;
    } else {
        data.led.mode = LedData::BLINK;
    }

    // PC からのコマンドはボタンより優先する
    if (data.link.commandReceived) {
        if (strcmp(data.link.command, "ON") == 0)  data.led.mode = LedData::ON;
        if (strcmp(data.link.command, "OFF") == 0) data.led.mode = LedData::OFF;
    }

    // PC へ周期送信する値を決める（形式は docs/design/interfaces.md に書く）
    data.link.statusValue = static_cast<int>(data.led.mode);
}

// ===== 初期化ヘルパ =====
// 初期化に失敗したモジュールは enabled = false にして、残りだけで動かす。
// 「1 個のセンサが壊れると全部動かない」を避けるための実戦的な作法。
constexpr int MAX_RETRY = 3;

void initWithRetry(IModule* module, const char* name) {
    bool ok = false;
    for (int i = 0; i < MAX_RETRY && !ok; i++) {
        ok = module->init();
        if (!ok) delay(50);
    }
    module->enabled = ok;
    Serial.print("[INIT] ");
    Serial.print(name);
    Serial.println(ok ? " = OK" : " = NG (無効化しました)");
}

}  // namespace

void setup() {
    // 共有資源（Serial / I2C / SPI）は、モジュールより先にここで開く。
    // 各モジュールが勝手に開くと二重初期化になるため。
    Serial.begin(SERIAL_BAUDRATE);
    // 例: Wire.begin();   // I2C を使うモジュールがあるとき

    Serial.println("[System] node_01 起動");

    initWithRetry(&gButton, "ButtonModule");
    initWithRetry(&gLed, "LedModule");
    initWithRetry(&gLink, "SerialLinkModule");

    Serial.println("[System] node_01 起動完了");
}

void loop() {
    // ① 入力フェーズ
    for (IModule* m : gInputs) {
        if (m->enabled) m->updateInput(gData);
    }

    // ② ロジックフェーズ
    applyPattern(gData);

    // ③ 出力フェーズ
    for (IModule* m : gOutputs) {
        if (m->enabled) m->updateOutput(gData);
    }
}
