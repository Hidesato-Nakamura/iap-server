const express = require("express");
const request = require("request");

var admin = require("firebase-admin");
var serviceAccount = require("./path/to/effectron-e412b-firebase-adminsdk-wvzuu-113c4167d3.json");

//firebaseSDKの初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://effectron-e412b.firebaseio.com",
});
var database = admin.database();
// var ref = db.ref("server/saving-data/fireblog");

const bodyParser = require("body-parser");

const app = express();

const sandbox_url = "https://sandbox.itunes.apple.com/verifyReceipt";
const url = "https://buy.itunes.apple.com/verifyReceipt";

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

app.listen(3000);
console.log("Server is online.");

app.post("/", function (req, res) {
  var data = req.body;

  //オブジェクトデータをJSONにパス
  var json = JSON.parse(data.Receipt);
  var payload = JSON.parse(json.Payload);

  console.log(json.TransactionID);

  //データベースにデータ送信！(実際は検証成功後のレシートの情報)
  database.ref("users").push({
    TransactionID: json.TransactionID,
    Payload: payload.this,
  });

  //apple storeに送信用
  var options = {
    method: "POST",
    body: { "receipt-data": data.Receipt },
    json: true,
    url: url,
  };
  request(options, function (error, response, reqbody) {
    console.log(reqbody.status);
    switch (reqbody.status) {
      case 0:
        //結果が正しかった場合、トランザクションIDをfirebaseに保存しておく。
        res.send("レシートの検証に成功しました。");
        break;
      case 21000:
        res.send(
          "App Storeは、指定されたJSONオブジェクトを読み取ることができませんでした。"
        );
        break;
      case 21002:
        res.send(
          "receipt-dataプロパティのデータの形式が正しくないか、欠落しています。"
        );
        break;
      case 21003:
        res.send("領収書を認証できませんでした。");
        break;
      case 21004:
        res.send(
          "指定した共有秘密は、アカウントのファイルにある共有秘密と一致しません。"
        );
        break;
      case 21005:
        res.send("レシートサーバーは現在利用できません。");
        break;
      case 21006:
        res.send(
          "この領収書は有効ですが、サブスクリプションの有効期限が切れています。このステータスコードがサーバーに返されると、レシートデータもデコードされ、応答の一部として返されます。自動更新可能なサブスクリプションのiOS 6スタイルのトランザクションレシートに対してのみ返されます。"
        );
        break;
      case 21007:
        res.send(
          "このレシートはテスト環境からのものですが、検証のために実稼働環境に送信されました。代わりにテスト環境に転送し直します。"
        );
        var _options = {
          method: "POST",
          body: {
            "receipt-data": req.body.Payload,
            password: req.body.Password,
          },
          json: true,
          url: sandbox_url,
        };
        request(_options, function (error, response, _reqbody) {
          console.log(_reqbody.status);
        });
        break;
      case 21008:
        res.send(
          "この領収書は実稼働環境からのものですが、検証のためにテスト環境に送信されました。代わりに本番環境に送信してください。"
        );
        break;
      case 21010:
        res.send(
          "この領収書は承認されませんでした。これは、購入したことがない場合と同じように扱います。"
        );
        break;
      default:
        break;
    }
  });
});

console.log("Server running at http://127.0.0.1:3000/");
