#ifndef CREATEDECKDIALOG_H
#define CREATEDECKDIALOG_H

#include <QDialog>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QListWidget>
#include <QFileDialog>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QHttpMultiPart>
#include <QMimeDatabase>
#include <QProgressBar>
#include <QMessageBox>
#include <QScrollArea>
#include <QDragEnterEvent>
#include <QDropEvent>
#include <QMimeData>

class CreateDeckDialog : public QDialog
{
    Q_OBJECT

public:
    explicit CreateDeckDialog(QWidget *parent = nullptr);

protected:
    void dragEnterEvent(QDragEnterEvent *event) override;
    void dropEvent(QDropEvent *event) override;
    
private slots:
    void onAddFilesClicked();
    void onRemoveFileClicked();
    void onCreateDeckClicked();
    void onUploadProgress(qint64 bytesSent, qint64 bytesTotal);
    void onNetworkReplyFinished();
    void updateCreateButtonState();

private:
    void setupUI();
    void addFiles(const QStringList &filePaths);
    bool validateFile(const QString &filePath);
    
    QLineEdit *titleEdit;
    QListWidget *fileListWidget;
    QPushButton *addFilesButton;
    QPushButton *removeFileButton;
    QPushButton *createDeckButton;
    QPushButton *cancelButton;
    QProgressBar *uploadProgressBar;
    QLabel *statusLabel;
    
    QNetworkAccessManager *networkManager;
    QNetworkReply *currentReply;
};

#endif // CREATEDECKDIALOG_H