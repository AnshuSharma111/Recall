#include "createdeckdialog.h"
#include <QFileInfo>
#include <QUrl>
#include <QMimeType>
#include <QStandardItemModel>
#include <QJsonDocument>
#include <QJsonObject>
#include <QFile>

CreateDeckDialog::CreateDeckDialog(QWidget *parent) : QDialog(parent), currentReply(nullptr)
{
    setWindowTitle("Create New Deck");
    setMinimumSize(600, 500);
    setAcceptDrops(true);
    
    setupUI();
    
    networkManager = new QNetworkAccessManager(this);
    
    // Connect signals & slots
    connect(addFilesButton, &QPushButton::clicked, this, &CreateDeckDialog::onAddFilesClicked);
    connect(removeFileButton, &QPushButton::clicked, this, &CreateDeckDialog::onRemoveFileClicked);
    connect(createDeckButton, &QPushButton::clicked, this, &CreateDeckDialog::onCreateDeckClicked);
    connect(cancelButton, &QPushButton::clicked, this, &QDialog::reject);
    connect(titleEdit, &QLineEdit::textChanged, this, &CreateDeckDialog::updateCreateButtonState);
    connect(fileListWidget, &QListWidget::itemSelectionChanged, this, &CreateDeckDialog::updateCreateButtonState);
    
    // Initial button state
    updateCreateButtonState();
}

void CreateDeckDialog::setupUI()
{
    // Create main layout
    QVBoxLayout *mainLayout = new QVBoxLayout(this);
    mainLayout->setSpacing(16);
    mainLayout->setContentsMargins(24, 24, 24, 24);
    
    // Title section
    QLabel *titleLabel = new QLabel("Deck Title", this);
    titleLabel->setStyleSheet("font-weight: bold; font-size: 16px; color: #BB86FC;");
    
    titleEdit = new QLineEdit(this);
    titleEdit->setPlaceholderText("Enter a title for your deck...");
    titleEdit->setStyleSheet(
        "QLineEdit {"
        "   background-color: #2D2D2D;"
        "   border: 1px solid #444444;"
        "   border-radius: 4px;"
        "   padding: 10px;"
        "   color: #FFFFFF;"
        "   font-size: 14px;"
        "}"
        "QLineEdit:focus {"
        "   border: 1px solid #BB86FC;"
        "}"
    );
    
    mainLayout->addWidget(titleLabel);
    mainLayout->addWidget(titleEdit);
    mainLayout->addSpacing(16);
    
    // Files section
    QLabel *filesLabel = new QLabel("Files (PDFs, Images)", this);
    filesLabel->setStyleSheet("font-weight: bold; font-size: 16px; color: #BB86FC;");
    
    // Drop area instructions
    QLabel *dropInstructionsLabel = new QLabel("Drag and drop files here or use the Add Files button", this);
    dropInstructionsLabel->setStyleSheet("color: #AAAAAA; font-style: italic;");
    dropInstructionsLabel->setAlignment(Qt::AlignCenter);
    
    // File list
    fileListWidget = new QListWidget(this);
    fileListWidget->setStyleSheet(
        "QListWidget {"
        "   background-color: #2D2D2D;"
        "   border: 1px dashed #444444;"
        "   border-radius: 4px;"
        "   padding: 8px;"
        "   color: #FFFFFF;"
        "   font-size: 14px;"
        "   min-height: 150px;"
        "}"
        "QListWidget::item {"
        "   padding: 8px;"
        "   border-bottom: 1px solid #3D3D3D;"
        "}"
        "QListWidget::item:selected {"
        "   background-color: #3F3F3F;"
        "   color: #BB86FC;"
        "}"
    );
    
    // File buttons
    QHBoxLayout *fileButtonsLayout = new QHBoxLayout();
    
    addFilesButton = new QPushButton("Add Files", this);
    addFilesButton->setStyleSheet(
        "QPushButton {"
        "   background-color: #2D2D2D;"
        "   color: #BB86FC;"
        "   border: 1px solid #BB86FC;"
        "   border-radius: 4px;"
        "   padding: 8px 16px;"
        "   font-weight: bold;"
        "}"
        "QPushButton:hover {"
        "   background-color: #3D3D3D;"
        "}"
        "QPushButton:pressed {"
        "   background-color: #444444;"
        "}"
    );
    
    removeFileButton = new QPushButton("Remove Selected", this);
    removeFileButton->setStyleSheet(
        "QPushButton {"
        "   background-color: #2D2D2D;"
        "   color: #CF6679;"
        "   border: 1px solid #CF6679;"
        "   border-radius: 4px;"
        "   padding: 8px 16px;"
        "}"
        "QPushButton:hover {"
        "   background-color: #3D3D3D;"
        "}"
        "QPushButton:pressed {"
        "   background-color: #444444;"
        "}"
        "QPushButton:disabled {"
        "   background-color: #2D2D2D;"
        "   color: #666666;"
        "   border: 1px solid #666666;"
        "}"
    );
    
    fileButtonsLayout->addWidget(addFilesButton);
    fileButtonsLayout->addWidget(removeFileButton);
    fileButtonsLayout->addStretch();
    
    mainLayout->addWidget(filesLabel);
    mainLayout->addWidget(dropInstructionsLabel);
    mainLayout->addWidget(fileListWidget);
    mainLayout->addLayout(fileButtonsLayout);
    mainLayout->addSpacing(16);
    
    // Progress section
    uploadProgressBar = new QProgressBar(this);
    uploadProgressBar->setRange(0, 100);
    uploadProgressBar->setValue(0);
    uploadProgressBar->setTextVisible(true);
    uploadProgressBar->setVisible(false);
    uploadProgressBar->setStyleSheet(
        "QProgressBar {"
        "   border: 1px solid #444444;"
        "   border-radius: 4px;"
        "   background-color: #2D2D2D;"
        "   color: #FFFFFF;"
        "   text-align: center;"
        "   height: 20px;"
        "}"
        "QProgressBar::chunk {"
        "   background-color: #BB86FC;"
        "   border-radius: 3px;"
        "}"
    );
    
    statusLabel = new QLabel(this);
    statusLabel->setVisible(false);
    statusLabel->setAlignment(Qt::AlignCenter);
    statusLabel->setStyleSheet("color: #BB86FC; margin-top: 8px;");
    
    mainLayout->addWidget(uploadProgressBar);
    mainLayout->addWidget(statusLabel);
    
    // Bottom buttons
    QHBoxLayout *bottomButtonsLayout = new QHBoxLayout();
    
    cancelButton = new QPushButton("Cancel", this);
    cancelButton->setStyleSheet(
        "QPushButton {"
        "   background-color: #2D2D2D;"
        "   color: #FFFFFF;"
        "   border: 1px solid #444444;"
        "   border-radius: 4px;"
        "   padding: 10px 24px;"
        "}"
        "QPushButton:hover {"
        "   background-color: #3D3D3D;"
        "}"
        "QPushButton:pressed {"
        "   background-color: #444444;"
        "}"
    );
    
    createDeckButton = new QPushButton("Create Deck", this);
    createDeckButton->setStyleSheet(
        "QPushButton {"
        "   background-color: #BB86FC;"
        "   color: #121212;"
        "   border: none;"
        "   border-radius: 4px;"
        "   padding: 10px 24px;"
        "   font-weight: bold;"
        "}"
        "QPushButton:hover {"
        "   background-color: #9969DA;"
        "}"
        "QPushButton:pressed {"
        "   background-color: #7F39FB;"
        "}"
        "QPushButton:disabled {"
        "   background-color: #666666;"
        "   color: #2D2D2D;"
        "}"
    );
    
    bottomButtonsLayout->addStretch();
    bottomButtonsLayout->addWidget(cancelButton);
    bottomButtonsLayout->addWidget(createDeckButton);
    
    mainLayout->addSpacing(8);
    mainLayout->addLayout(bottomButtonsLayout);
    
    // Set dialog styling
    setStyleSheet(
        "QDialog {"
        "   background-color: #121212;"
        "   color: #FFFFFF;"
        "}"
        "QLabel {"
        "   color: #FFFFFF;"
        "}"
    );
}

void CreateDeckDialog::onAddFilesClicked()
{
    QStringList filePaths = QFileDialog::getOpenFileNames(
        this,
        "Select Files",
        QString(),
        "PDF & Images (*.pdf *.jpg *.jpeg *.png)"
    );
    
    if (!filePaths.isEmpty()) {
        addFiles(filePaths);
    }
    
    updateCreateButtonState();
}

void CreateDeckDialog::addFiles(const QStringList &filePaths)
{
    for (const QString &filePath : filePaths) {
        if (validateFile(filePath)) {
            QFileInfo fileInfo(filePath);
            QListWidgetItem *item = new QListWidgetItem(fileInfo.fileName());
            item->setData(Qt::UserRole, filePath);
            
            // Add appropriate icon based on file type
            QIcon pdfIcon(":/icons/pdf.png");
            QIcon imageIcon(":/icons/image.png");
            
            if (fileInfo.suffix().toLower() == "pdf") {
                if (!pdfIcon.isNull()) {
                    item->setIcon(pdfIcon);
                }
            } else {
                if (!imageIcon.isNull()) {
                    item->setIcon(imageIcon);
                }
            }
            
            fileListWidget->addItem(item);
        }
    }
}

bool CreateDeckDialog::validateFile(const QString &filePath)
{
    QFileInfo fileInfo(filePath);
    
    // Check if file exists and is readable
    if (!fileInfo.exists() || !fileInfo.isReadable()) {
        QMessageBox::warning(this, "Invalid File", 
                            "The file does not exist or is not readable:\n" + filePath);
        return false;
    }
    
    // Check file type
    QMimeDatabase db;
    QMimeType mime = db.mimeTypeForFile(filePath);
    QString mimeStr = mime.name();
    
    if (!mimeStr.startsWith("application/pdf") && 
        !mimeStr.startsWith("image/jpeg") && 
        !mimeStr.startsWith("image/png") && 
        !mimeStr.startsWith("image/jpg")) {
        
        QMessageBox::warning(this, "Invalid File Type", 
                            "Only PDF, JPEG, and PNG files are supported.\n"
                            "File: " + fileInfo.fileName() + "\n"
                            "Type: " + mimeStr);
        return false;
    }
    
    // Check if file is already in the list
    for (int i = 0; i < fileListWidget->count(); i++) {
        QListWidgetItem *item = fileListWidget->item(i);
        if (item->data(Qt::UserRole).toString() == filePath) {
            // File already exists in the list
            return false;
        }
    }
    
    return true;
}

void CreateDeckDialog::onRemoveFileClicked()
{
    QList<QListWidgetItem*> selectedItems = fileListWidget->selectedItems();
    for (QListWidgetItem *item : selectedItems) {
        delete fileListWidget->takeItem(fileListWidget->row(item));
    }
    
    updateCreateButtonState();
}

void CreateDeckDialog::updateCreateButtonState()
{
    // Enable the create button only if there's a title and at least one file
    bool hasTitle = !titleEdit->text().trimmed().isEmpty();
    bool hasFiles = fileListWidget->count() > 0;
    
    createDeckButton->setEnabled(hasTitle && hasFiles);
}

void CreateDeckDialog::onCreateDeckClicked()
{
    if (currentReply) {
        QMessageBox::warning(this, "Upload in Progress", 
                           "A deck upload is already in progress. Please wait for it to complete.");
        return;
    }
    
    QString title = titleEdit->text().trimmed();
    if (title.isEmpty()) {
        QMessageBox::warning(this, "Missing Title", "Please enter a title for your deck.");
        return;
    }
    
    if (fileListWidget->count() == 0) {
        QMessageBox::warning(this, "No Files", "Please add at least one file to create a deck.");
        return;
    }
    
    // Disable UI elements during upload
    titleEdit->setEnabled(false);
    fileListWidget->setEnabled(false);
    addFilesButton->setEnabled(false);
    removeFileButton->setEnabled(false);
    createDeckButton->setEnabled(false);
    cancelButton->setEnabled(false);
    
    // Show progress UI
    uploadProgressBar->setValue(0);
    uploadProgressBar->setVisible(true);
    statusLabel->setText("Preparing files...");
    statusLabel->setVisible(true);
    
    // Create multipart request
    QHttpMultiPart *multiPart = new QHttpMultiPart(QHttpMultiPart::FormDataType);
    
    // Add deck title - FastAPI specific format
    QHttpPart titlePart;
    titlePart.setHeader(QNetworkRequest::ContentDispositionHeader, 
                      QVariant("form-data; name=deck_title"));
    titlePart.setBody(title.toUtf8());
    multiPart->append(titlePart);
    
    // Add files
    for (int i = 0; i < fileListWidget->count(); i++) {
        QListWidgetItem *item = fileListWidget->item(i);
        QString filePath = item->data(Qt::UserRole).toString();
        QFileInfo fileInfo(filePath);
        
        QFile *file = new QFile(filePath);
        if (!file->open(QIODevice::ReadOnly)) {
            QMessageBox::warning(this, "File Error", 
                               "Could not open file: " + fileInfo.fileName());
            file->deleteLater();
            continue;
        }
        
        QHttpPart filePart;
        // FastAPI expects this exact format for file uploads
        filePart.setHeader(QNetworkRequest::ContentDispositionHeader, 
                         QVariant("form-data; name=files; filename=\"" + fileInfo.fileName() + "\""));
        
        // Set content type based on file extension
        QString mimeType;
        if (fileInfo.suffix().toLower() == "pdf") {
            mimeType = "application/pdf";
        } else if (fileInfo.suffix().toLower() == "png") {
            mimeType = "image/png";
        } else if (fileInfo.suffix().toLower() == "jpg" || fileInfo.suffix().toLower() == "jpeg") {
            mimeType = "image/jpeg";
        }
        
        filePart.setHeader(QNetworkRequest::ContentTypeHeader, QVariant(mimeType));
        filePart.setBodyDevice(file);
        file->setParent(multiPart); // File will be deleted when multiPart is deleted
        multiPart->append(filePart);
    }
    
    // Create network request
    QNetworkRequest request(QUrl("http://127.0.0.1:8000/api/create_deck"));
    request.setRawHeader("X-API-Key", "key1");
    
    statusLabel->setText("Uploading files...");
    
    // Send the request
    currentReply = networkManager->post(request, multiPart);
    multiPart->setParent(currentReply); // multiPart will be deleted when the reply is deleted
    
    // Connect signals for tracking upload progress and completion
    connect(currentReply, &QNetworkReply::uploadProgress, 
            this, &CreateDeckDialog::onUploadProgress);
    connect(currentReply, &QNetworkReply::finished, 
            this, &CreateDeckDialog::onNetworkReplyFinished);
}

void CreateDeckDialog::onUploadProgress(qint64 bytesSent, qint64 bytesTotal)
{
    if (bytesTotal > 0) {
        int progress = static_cast<int>((bytesSent * 100) / bytesTotal);
        uploadProgressBar->setValue(progress);
    }
}

void CreateDeckDialog::onNetworkReplyFinished()
{
    if (!currentReply) {
        return;
    }
    
    // Re-enable UI elements
    titleEdit->setEnabled(true);
    fileListWidget->setEnabled(true);
    addFilesButton->setEnabled(true);
    removeFileButton->setEnabled(true);
    updateCreateButtonState();
    cancelButton->setEnabled(true);
    
    // Read the response data
    QByteArray responseData = currentReply->readAll();
    int statusCode = currentReply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
    
    QString errorMessage = "Unknown error occurred.";
    
    if (currentReply->error() == QNetworkReply::NoError) {
        // Success
        statusLabel->setText("Deck created successfully!");
        statusLabel->setStyleSheet("color: #03DAC6; margin-top: 8px;");
        
        QJsonDocument jsonDoc = QJsonDocument::fromJson(responseData);
        QJsonObject jsonObj = jsonDoc.object();
        
        // Show success message and close dialog after a delay
        QMessageBox::information(this, "Success", 
                              "Deck '" + titleEdit->text() + "' has been created successfully!\n\n" +
                              "The deck will now be processed on the server.");
        
        accept(); // Close the dialog with success result
        
    } else {
        // Handle error
        statusLabel->setText("Error: " + currentReply->errorString() + " (Status: " + QString::number(statusCode) + ")");
        statusLabel->setStyleSheet("color: #CF6679; margin-top: 8px;");
        
        // Display detailed error information for debugging
        QString debugInfo = "Error details:\n";
        debugInfo += "Status code: " + QString::number(statusCode) + "\n";
        debugInfo += "Error string: " + currentReply->errorString() + "\n";
        debugInfo += "Raw response: " + QString(responseData);
        
        QJsonDocument jsonDoc = QJsonDocument::fromJson(responseData);
        QJsonObject jsonObj = jsonDoc.object();
        
        QString errorMessage = "Failed to create deck.";
        if (jsonObj.contains("detail")) {
            if (jsonObj["detail"].isObject()) {
                QJsonObject detailObj = jsonObj["detail"].toObject();
                if (detailObj.contains("message")) {
                    errorMessage = detailObj["message"].toString();
                }
            } else if (jsonObj["detail"].isString()) {
                errorMessage = jsonObj["detail"].toString();
            }
        }
        
        QMessageBox::critical(this, "Error", "Could not create deck: " + errorMessage + "\n\n" + debugInfo);
        
        uploadProgressBar->setVisible(false);
    }
    
    currentReply->deleteLater();
    currentReply = nullptr;
}

void CreateDeckDialog::dragEnterEvent(QDragEnterEvent *event)
{
    if (event->mimeData()->hasUrls()) {
        event->acceptProposedAction();
    }
}

void CreateDeckDialog::dropEvent(QDropEvent *event)
{
    QStringList filePaths;
    
    for (const QUrl &url : event->mimeData()->urls()) {
        if (url.isLocalFile()) {
            filePaths.append(url.toLocalFile());
        }
    }
    
    if (!filePaths.isEmpty()) {
        addFiles(filePaths);
        updateCreateButtonState();
    }
    
    event->acceptProposedAction();
}