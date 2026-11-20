.class public Lcom/charles/curriculo/Task;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;

.field private act:Lcom/charles/curriculo/MainActivity;
.field private kind:I
.field private a:Ljava/lang/String;
.field private b:Ljava/lang/String;

.method public constructor <init>(Lcom/charles/curriculo/MainActivity;ILjava/lang/String;Ljava/lang/String;)V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lcom/charles/curriculo/Task;->act:Lcom/charles/curriculo/MainActivity;
    iput p2, p0, Lcom/charles/curriculo/Task;->kind:I
    iput-object p3, p0, Lcom/charles/curriculo/Task;->a:Ljava/lang/String;
    iput-object p4, p0, Lcom/charles/curriculo/Task;->b:Ljava/lang/String;
    return-void
.end method

.method public run()V
    .locals 7
    iget v0, p0, Lcom/charles/curriculo/Task;->kind:I
    iget-object v1, p0, Lcom/charles/curriculo/Task;->act:Lcom/charles/curriculo/MainActivity;
    if-nez v0, :not_copy
    const-string v2, "clipboard"
    invoke-virtual {v1, v2}, Landroid/app/Activity;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;
    move-result-object v2
    check-cast v2, Landroid/content/ClipboardManager;
    const-string v3, "Curriculo"
    iget-object v4, p0, Lcom/charles/curriculo/Task;->b:Ljava/lang/String;
    iget-object v5, p0, Lcom/charles/curriculo/Task;->a:Ljava/lang/String;
    invoke-static {v3, v4, v5}, Landroid/content/ClipData;->newHtmlText(Ljava/lang/CharSequence;Ljava/lang/CharSequence;Ljava/lang/String;)Landroid/content/ClipData;
    move-result-object v3
    invoke-virtual {v2, v3}, Landroid/content/ClipboardManager;->setPrimaryClip(Landroid/content/ClipData;)V
    return-void
    :not_copy
    const/4 v2, 0x1
    if-ne v0, v2, :share
    const-string v2, "print"
    invoke-virtual {v1, v2}, Landroid/app/Activity;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;
    move-result-object v2
    check-cast v2, Landroid/print/PrintManager;
    iget-object v3, v1, Lcom/charles/curriculo/MainActivity;->web:Landroid/webkit/WebView;
    const-string v4, "Curriculo"
    invoke-virtual {v3, v4}, Landroid/webkit/WebView;->createPrintDocumentAdapter(Ljava/lang/String;)Landroid/print/PrintDocumentAdapter;
    move-result-object v3
    new-instance v5, Landroid/print/PrintAttributes$Builder;
    invoke-direct {v5}, Landroid/print/PrintAttributes$Builder;-><init>()V
    sget-object v6, Landroid/print/PrintAttributes$MediaSize;->ISO_A4:Landroid/print/PrintAttributes$MediaSize;
    invoke-virtual {v5, v6}, Landroid/print/PrintAttributes$Builder;->setMediaSize(Landroid/print/PrintAttributes$MediaSize;)Landroid/print/PrintAttributes$Builder;
    move-result-object v5
    invoke-virtual {v5}, Landroid/print/PrintAttributes$Builder;->build()Landroid/print/PrintAttributes;
    move-result-object v5
    invoke-virtual {v2, v4, v3, v5}, Landroid/print/PrintManager;->print(Ljava/lang/String;Landroid/print/PrintDocumentAdapter;Landroid/print/PrintAttributes;)Landroid/print/PrintJob;
    return-void
    :share
    new-instance v2, Landroid/content/Intent;
    const-string v3, "android.intent.action.SEND"
    invoke-direct {v2, v3}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V
    const-string v3, "text/plain"
    invoke-virtual {v2, v3}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;
    const-string v3, "android.intent.extra.TEXT"
    iget-object v4, p0, Lcom/charles/curriculo/Task;->a:Ljava/lang/String;
    invoke-virtual {v2, v3, v4}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;
    const/4 v3, 0x0
    invoke-static {v2, v3}, Landroid/content/Intent;->createChooser(Landroid/content/Intent;Ljava/lang/CharSequence;)Landroid/content/Intent;
    move-result-object v2
    invoke-virtual {v1, v2}, Landroid/app/Activity;->startActivity(Landroid/content/Intent;)V
    return-void
.end method
