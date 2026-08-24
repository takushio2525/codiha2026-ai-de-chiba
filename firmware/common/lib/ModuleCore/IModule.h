// IModule.h — EMA（Embedded Module Architecture）の入出力モジュール抽象基底
//
// このファイルは「どんなテーマのプロジェクトでもそのまま使える」骨格。
// プロジェクト固有の型は一切含まないので，中身を書き換える必要はない。
//
// EMA の考え方:
//   1 台のマイコンの loop() を「入力 → ロジック → 出力」の 3 フェーズに固定し，
//   各ハードウェア（センサ・LED・通信…）を IModule を継承した「モジュール」として書く。
//   モジュール同士は直接呼び合わず，やり取りは必ず SystemData 経由にする。
//
//   → 誰がどのモジュールを書くかで分担でき，後から差し替えやテストがしやすくなる。
//
// 詳しい解説とリファレンス実装:
//   https://github.com/takushio2525/Embedded-Module-Architecture
#pragma once

// SystemData は各ノードが include/SystemData.h で定義する。
// ここでは前方宣言だけしておき，ModuleCore がプロジェクトに依存しないようにする。
struct SystemData;

class IModule {
public:
    // false にすると loop() 内で updateInput() / updateOutput() がスキップされる。
    // 初期化に失敗したモジュールを無効化して，残りだけで動かすために使う。
    bool enabled = true;

    virtual ~IModule() = default;

    // ハードウェアの初期化。成功したら true を返す。
    // 初期化が要らないモジュールはオーバーライドしなくてよい。
    virtual bool init() { return true; }

    // 入力フェーズで呼ばれる。センサ値や受信結果を data に「書く」。
    // 入力を持つモジュールだけがオーバーライドする。
    virtual void updateInput(SystemData& data) { (void)data; }

    // 出力フェーズで呼ばれる。data の値をハードウェアや送信に「反映する」。
    // 出力を持つモジュールだけがオーバーライドする。
    virtual void updateOutput(SystemData& data) { (void)data; }

    // 後始末（リソース解放）。必要なモジュールだけがオーバーライドする。
    virtual void deinit() {}
};
