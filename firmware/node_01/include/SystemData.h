// SystemData.h — このノード（node_01）の中で共有する状態をひとまとめにした構造体
//
// EMA では、モジュール同士が直接呼び合うことを禁止し、やり取りは必ずここを経由する。
//   入力モジュール         : ここに「書く」
//   ロジック(applyPattern) : ここを読んで、ここに「書く」
//   出力モジュール         : ここを「読む」
//
// 【重要】このファイルは何も include しない。
// モジュールのヘッダが SystemData.h を include する（依存は一方向）。
// 逆向きに SystemData.h からモジュールのヘッダを include すると、
// 循環インクルードになるうえ、PlatformIO のビルドも通らなくなる。
//
// モジュールを増やしたら、そのモジュールが使うデータ構造をここに足す。
#pragma once

#include <stdint.h>

// ===== ButtonModule が読み書きするデータ =====
struct ButtonData {
    bool pressed = false;      // 今押されているか
    bool justPressed = false;  // このループで「押した瞬間」か（立ち上がり検出）
};

// ===== LedModule が読むデータ =====
struct LedData {
    enum Mode { OFF, ON, BLINK };
    Mode mode = OFF;
};

// ===== SerialLinkModule が読み書きするデータ =====
// マイコンはメモリが限られるので、String ではなく固定長バッファを使う
constexpr int SERIAL_LINK_BUF_SIZE = 32;

struct SerialLinkData {
    // 受信（入力フェーズで埋まる）
    bool commandReceived = false;
    char command[SERIAL_LINK_BUF_SIZE] = {0};
    // 送信（ロジックが書き、出力フェーズで送られる）
    int  statusValue = 0;
};

// ===== このノードの状態をすべて集めたもの =====
struct SystemData {
    ButtonData     button;   // 入力モジュールが書く
    LedData        led;      // 出力モジュールが読む
    SerialLinkData link;     // 入出力の両方を持つモジュールが読み書きする

    // モジュールを増やしたら、ここにも 1 行足す
    // 例: SensorData sensor;  MotorData motor;
};
