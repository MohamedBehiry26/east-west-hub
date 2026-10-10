# إنشاء حساب أدمن

## من الداشبورد

سجّل الدخول بحساب أدمن، ثم افتح «حسابات الأدمن» من القائمة الجانبية. اكتب الاسم والبريد وكلمة المرور وتأكيدها، واضغط «إنشاء الحساب». يستطيع صاحب الحساب الجديد تسجيل الدخول فورًا من /admin/login.

كلمة المرور لا تقل عن 12 حرفًا وتحتوي حرفًا إنجليزيًا كبيرًا وصغيرًا ورقمًا ورمزًا. الحساب الجديد له صلاحية أدمن كاملة ويمكنه إضافة حسابات أخرى. البريد الموجود بالفعل يُرفض؛ لا يتم تغيير كلمة مرور حساب موجود.

## الحساب الأول فقط

إذا لم يوجد أي حساب أدمن بعد، يستخدم المسؤول التقني إعدادات التشغيل التالية لإنشاء الحساب الأول. بعد ذلك، أضف الحسابات من الداشبورد.

## محليًا على Windows

أوقف الـAPI الحالي أولًا حتى يكون المنفذ 5080 متاحًا. افتح PowerShell داخل مجلد المشروع الذي يحتوي على SpaceMedia.sln، ثم نفّذ:

```powershell
$env:AdminBootstrap__Email = Read-Host 'Admin email'
$adminPassword = Read-Host 'Admin password' -AsSecureString
$env:AdminBootstrap__Password = [pscredential]::new('admin', $adminPassword).GetNetworkCredential().Password
try {
    dotnet run --project src/backend/SpaceMedia.Api
} finally {
    Remove-Item Env:AdminBootstrap__Email, Env:AdminBootstrap__Password -ErrorAction SilentlyContinue
    Remove-Variable adminPassword -ErrorAction SilentlyContinue
}
```

عندما يبدأ الـAPI، يكون الحساب قد أُنشئ. جرّب الدخول من `/admin/login`. كلمة المرور لا تقل عن 12 حرفًا وتحتوي على حرف إنجليزي كبير وصغير ورقم ورمز.

بعد التأكد، أوقف التشغيل بـ Ctrl+C ليتم مسح متغيرات الإنشاء من جلسة PowerShell، ثم شغّل الـAPI بالطريقة العادية:

```powershell
dotnet run --project src/backend/SpaceMedia.Api
```

لإضافة أدمن آخر، كرر الخطوات ببريد جديد. الحسابات السابقة تظل موجودة. استخدام بريد موجود لا يغيّر كلمة مروره؛ إذا لم يكن له دور Admin، تمنحه هذه العملية ذلك الدور.

## بعد النشر

اضبط `AdminBootstrap__Email` و`AdminBootstrap__Password` في مخزن الأسرار الخاص باستضافة الـAPI، ثم أعد تشغيله. بعد نجاح إنشاء الحساب، احذف المتغيرين وأعد التشغيل. لا تضع كلمة المرور في ملفات المشروع أو إعدادات الواجهة.

هذه العملية مخصصة لإنشاء الحسابات وليست لاستعادة كلمة مرور حساب موجود.