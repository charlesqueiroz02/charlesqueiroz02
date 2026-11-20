.class public Lcom/charles/curriculo/Bridge;
.super Ljava/lang/Object;

.field private act:Lcom/charles/curriculo/MainActivity;

.method public constructor <init>(Lcom/charles/curriculo/MainActivity;)V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lcom/charles/curriculo/Bridge;->act:Lcom/charles/curriculo/MainActivity;
    return-void
.end method

.method public copy(Ljava/lang/String;Ljava/lang/String;)V
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    new-instance v0, Lcom/charles/curriculo/Task;
    iget-object v1, p0, Lcom/charles/curriculo/Bridge;->act:Lcom/charles/curriculo/MainActivity;
    const/4 v2, 0x0
    invoke-direct {v0, v1, v2, p1, p2}, Lcom/charles/curriculo/Task;-><init>(Lcom/charles/curriculo/MainActivity;ILjava/lang/String;Ljava/lang/String;)V
    invoke-virtual {v1, v0}, Landroid/app/Activity;->runOnUiThread(Ljava/lang/Runnable;)V
    return-void
.end method

.method public print()V
    .locals 4
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    new-instance v0, Lcom/charles/curriculo/Task;
    iget-object v1, p0, Lcom/charles/curriculo/Bridge;->act:Lcom/charles/curriculo/MainActivity;
    const/4 v2, 0x1
    const/4 v3, 0x0
    invoke-direct {v0, v1, v2, v3, v3}, Lcom/charles/curriculo/Task;-><init>(Lcom/charles/curriculo/MainActivity;ILjava/lang/String;Ljava/lang/String;)V
    invoke-virtual {v1, v0}, Landroid/app/Activity;->runOnUiThread(Ljava/lang/Runnable;)V
    return-void
.end method

.method public share(Ljava/lang/String;)V
    .locals 4
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    new-instance v0, Lcom/charles/curriculo/Task;
    iget-object v1, p0, Lcom/charles/curriculo/Bridge;->act:Lcom/charles/curriculo/MainActivity;
    const/4 v2, 0x2
    const/4 v3, 0x0
    invoke-direct {v0, v1, v2, p1, v3}, Lcom/charles/curriculo/Task;-><init>(Lcom/charles/curriculo/MainActivity;ILjava/lang/String;Ljava/lang/String;)V
    invoke-virtual {v1, v0}, Landroid/app/Activity;->runOnUiThread(Ljava/lang/Runnable;)V
    return-void
.end method
