#include "createdeckdialog.h"
#include <QFileInfo>
#include <QUrl>
#include <QMimeType>
#include <QStandardItemModel>
#include <QJsonDocument>
#include <QJsonObject>
#include <QFile>
#include <QTimer>

CreateDeckDialog::CreateDeckDialog(QWidget *parent) : QDialog(parent), currentReply(nullptr), statusReply(nullptr), processingComplete(false), deckId(""), pollingCounter(0), consecutiveErrorCount(0), backgroundModeOffered(false), currentState(DialogState::Idle), basePollingInterval(2000), maxPollingInterval(10000), currentPollingInterval(2000)
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
    connect(cancelButton, &QPushButton::clicked, this, [this]() {
        if (currentState == DialogState::Processing) {
            // Handle cancellation during processing
            if (QMessageBox::question(this, "Cancel Processing", 
                                    "Are you sure you want to cancel deck creation?",
                                    QMessageBox::Yes | QMessageBox::No) == QMessageBox::Yes) {
                
                // Stop any ongoing operations
                stopStatusPolling();
                
                if (currentReply) {
                    currentReply->abort();
                    currentReply = nullptr;
                }
                
                if (statusReply) {
                    statusReply->abort();
                    statusReply = nullptr;
                }
                
                // Reset to idle state and close
                setState(DialogState::Idle);
                QDialog::reject();
            }
        } else {
            // Normal cancel/close behavior
            QDialog::reject();
        }
    });
    connect(titleEdit, &QLineEdit::textChanged, this, &CreateDeckDialog::updateCreateButtonState);
    connect(fileListWidget, &QListWidget::itemSelectionChanged, this, &CreateDeckDialog::updateCreateButtonState);
    
    // Create status polling timer
    statusTimer = new QTimer(this);
    connect(statusTimer, &QTimer::timeout, this, &CreateDeckDialog::checkProcessingStatus);
    connect(statusTimer, &QTimer::timeout, this, &CreateDeckDialog::checkProcessingStatus);
    
    // Initial button state and UI state
    updateCreateButtonState();
    setState(DialogState::Idle);
}

CreateDeckDialog::~CreateDeckDialog()
{
    // Ensure proper cleanup of network resources
    stopStatusPolling();
    
    if (currentReply) {
        currentReply->abort();
        currentReply->deleteLater();
        currentReply = nullptr;
    }
    
    if (statusReply) {
        statusReply->abort();
        statusReply->deleteLater();
        statusReply = nullptr;
    }
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
    
    progressLabel = new QLabel(this);
    progressLabel->setVisible(false);
    progressLabel->setAlignment(Qt::AlignCenter);
    progressLabel->setStyleSheet("color: #03DAC6; margin-top: 8px; font-weight: bold;");
    progressLabel->setWordWrap(true);
    
    mainLayout->addWidget(uploadProgressBar);
    mainLayout->addWidget(statusLabel);
    mainLayout->addWidget(progressLabel);
    
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
    
    // Set processing state - this will handle UI updates
    setState(DialogState::Processing);
    processingComplete = false;
    
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
    
    // Note: UI state will be managed by setState() calls below
    
    // Read the response data
    QByteArray responseData = currentReply->readAll();
    int statusCode = currentReply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
    
    QString errorMessage = "Unknown error occurred.";
    
    if (currentReply->error() == QNetworkReply::NoError) {
        // Success - files uploaded, now processing
        QJsonDocument jsonDoc = QJsonDocument::fromJson(responseData);
        QJsonObject jsonObj = jsonDoc.object();
        
        // Extract the deck ID from the response for status polling
        if (jsonObj.contains("deck_id")) {
            deckId = jsonObj["deck_id"].toString();
            
            // Update status messages for processing phase
            statusLabel->setText("Processing deck...");
            progressLabel->setText("Files uploaded successfully. Processing deck...");
            
            // Start polling for status
            startStatusPolling();
        } else {
            // No deck ID in response - this is an error
            setState(DialogState::Error);
            statusLabel->setText("Error: No deck ID received from server");
            progressLabel->setText("The server did not provide a deck ID. Please try again.");
        }
        
    } else {
        // Handle error - set error state
        setState(DialogState::Error);
        
        // Parse error message from response
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
        
        statusLabel->setText("Upload failed: " + currentReply->errorString());
        progressLabel->setText(errorMessage);
        
        // Display detailed error information for debugging
        QString debugInfo = "Error details:\n";
        debugInfo += "Status code: " + QString::number(statusCode) + "\n";
        debugInfo += "Error string: " + currentReply->errorString() + "\n";
        debugInfo += "Raw response: " + QString(responseData);
        
        QMessageBox::critical(this, "Error", "Could not create deck: " + errorMessage + "\n\n" + debugInfo);
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

void CreateDeckDialog::startStatusPolling()
{
    if (deckId.isEmpty()) {
        return;
    }
    
    // Reset polling parameters
    currentPollingInterval = basePollingInterval;
    pollingCounter = 0;
    consecutiveErrorCount = 0;
    
    // Start with base polling interval
    statusTimer->start(currentPollingInterval);
    
    // Initial check
    checkProcessingStatus();
}

void CreateDeckDialog::stopStatusPolling()
{
    statusTimer->stop();
    
    // Cancel any pending status request
    if (statusReply) {
        statusReply->abort();
        statusReply->deleteLater();
        statusReply = nullptr;
    }
    
    // Reset polling parameters
    currentPollingInterval = basePollingInterval;
    pollingCounter = 0;
    consecutiveErrorCount = 0;
}

void CreateDeckDialog::checkProcessingStatus()
{
    if (deckId.isEmpty() || processingComplete) {
        stopStatusPolling();
        return;
    }
    
    // Don't make a new request if one is already in progress
    if (statusReply) {
        return;
    }
    
    QNetworkRequest request(QUrl(QString("http://127.0.0.1:8000/api/deck/%1/status").arg(deckId)));
    request.setRawHeader("X-API-Key", "key1");
    
    // Set timeout for the request (30 seconds)
    request.setTransferTimeout(30000);
    
    statusReply = networkManager->get(request);
    connect(statusReply, &QNetworkReply::finished, this, &CreateDeckDialog::onStatusCheckFinished);
}

void CreateDeckDialog::onStatusCheckFinished()
{
    if (!statusReply) {
        return;
    }
    
    // Increment the polling counter
    pollingCounter++;
    
    if (statusReply->error() == QNetworkReply::NoError) {
        QByteArray responseData = statusReply->readAll();
        QJsonDocument jsonDoc = QJsonDocument::fromJson(responseData);
        QJsonObject jsonObj = jsonDoc.object();
        
        QString status = jsonObj["status"].toString();
        QString message = jsonObj["message"].toString();
        
        // Reset consecutive error counter since we got a valid response
        consecutiveErrorCount = 0;
        
        // Implement adaptive polling - increase interval for long-running processes
        if (pollingCounter > 10 && status.toLower() == "processing") {
            // Gradually increase polling interval to reduce server load
            currentPollingInterval = qMin(maxPollingInterval, 
                                        static_cast<int>(basePollingInterval * (1 + pollingCounter / 20.0)));
            statusTimer->setInterval(currentPollingInterval);
        }
        
        // Update UI with status message and polling information
        QString statusMsg = message;
        
        // Add a note about long-running processes after a number of polls
        if (pollingCounter > 15 && status.toLower() == "processing") {
            statusMsg += " (Still processing... this may take a while)";
            
            // For very long-running processes, show additional information
            if (pollingCounter > 30) {
                statusMsg += "\nThis is taking longer than expected.";
            }
            
            // After a very long time, offer the option to continue in background
            if (pollingCounter > 60) {
                if (!backgroundModeOffered) {
                    backgroundModeOffered = true;
                    QMessageBox::StandardButton response = QMessageBox::question(this, "Long Process", 
                                          "This process is taking a very long time. Would you like to continue in the background?",
                                          QMessageBox::Yes | QMessageBox::No);
                                          
                    if (response == QMessageBox::Yes) {
                        // User chose to continue in background
                        QMessageBox::information(this, "Background Processing", 
                                             "Deck creation will continue in the background. You can check for new decks by refreshing the deck grid.");
                        
                        // Stop polling and close dialog gracefully
                        stopStatusPolling();
                        QDialog::accept();
                        return;
                    } else {
                        // User chose to continue waiting - reset the counter to prevent asking again too soon
                        // but still keep track that we've offered background mode
                        pollingCounter = 40; // Reset to a lower count but not completely
                        statusMsg += "\nContinuing in foreground. You can cancel at any time.";
                    }
                }
            }
        }
        
        progressLabel->setText(statusMsg);
        progressLabel->setStyleSheet("color: #03DAC6; margin-top: 8px;");
        progressLabel->setVisible(true);
        
        // Check if processing is complete
        if (isCompletionStatus(status)) {
            processingComplete = true;
            
            // Stop polling
            stopStatusPolling();
            
            // Check if it was successful or failed
            if (status.toLower() == "complete") {
                setState(DialogState::Complete);
                
                // Show success message
                QMessageBox::information(this, "Success", 
                                     "Deck '" + titleEdit->text() + "' has been created successfully!");
                                     
                // Close the dialog with success
                QDialog::accept();
            } else if (status.toLower() == "failed") {
                setState(DialogState::Error);
                statusLabel->setText("Deck creation failed");
                progressLabel->setText("Error: " + message);
                
                // Show error message
                QMessageBox::critical(this, "Error", 
                                   "Failed to create deck: " + message);
            }
        }
    } else {
        // Handle error
        consecutiveErrorCount++;
        
        QString errorMsg = "Error checking status: " + statusReply->errorString();
        
        // After several consecutive errors, give more detailed information
        if (consecutiveErrorCount > 3) {
            errorMsg += "\nThere might be an issue with the server. Check if the server is running.";
        }
        
        // After many consecutive errors, offer to cancel or continue
        if (consecutiveErrorCount > 10) {
            if (QMessageBox::question(this, "Connection Issues", 
                                  "Unable to connect to the server after multiple attempts.\nWould you like to cancel deck creation?",
                                  QMessageBox::Yes | QMessageBox::No) == QMessageBox::Yes) {
                // User chose to cancel - set error state
                setState(DialogState::Error);
                statusLabel->setText("Connection failed");
                progressLabel->setText("Unable to connect to server. Deck creation cancelled.");
                return;
            } else {
                // Reset counter to avoid asking too frequently
                consecutiveErrorCount = 4;
            }
        }
        
        // Update progress label with error message but stay in processing state
        progressLabel->setText(errorMsg);
        progressLabel->setStyleSheet("color: #CF6679; margin-top: 8px; font-weight: bold;");
        
        // If there's an error, continue polling but at a slower rate
        // Implement exponential backoff for errors
        int errorInterval = qMin(maxPollingInterval, basePollingInterval * (1 + consecutiveErrorCount));
        statusTimer->setInterval(errorInterval);
    }
    
    statusReply->deleteLater();
    statusReply = nullptr;
}

bool CreateDeckDialog::isCompletionStatus(const QString &status)
{
    QString lowerStatus = status.toLower();
    
    // Consider both "complete" and "failed" as completion statuses
    // This allows the dialog to close even if there's an error
    return lowerStatus == "complete" || lowerStatus == "failed";
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

void CreateDeckDialog::setState(DialogState newState)
{
    if (currentState == newState) {
        return; // No change needed
    }
    
    currentState = newState;
    updateUIForState();
}

void CreateDeckDialog::enableControls(bool enabled)
{
    titleEdit->setEnabled(enabled);
    fileListWidget->setEnabled(enabled);
    addFilesButton->setEnabled(enabled);
    removeFileButton->setEnabled(enabled);
    
    // Create button has special logic based on state and validation
    if (enabled && currentState == DialogState::Idle) {
        updateCreateButtonState(); // Use existing validation logic
    } else {
        createDeckButton->setEnabled(false);
    }
}

void CreateDeckDialog::updateUIForState()
{
    switch (currentState) {
        case DialogState::Idle:
            enableControls(true);
            cancelButton->setEnabled(true);
            cancelButton->setText("Cancel");
            
            // Hide progress elements
            uploadProgressBar->setVisible(false);
            statusLabel->setVisible(false);
            progressLabel->setVisible(false);
            
            // Reset progress bar
            uploadProgressBar->setValue(0);
            break;
            
        case DialogState::Processing:
            enableControls(false);
            cancelButton->setEnabled(true);
            cancelButton->setText("Cancel");
            
            // Show progress elements
            uploadProgressBar->setVisible(true);
            statusLabel->setVisible(true);
            progressLabel->setVisible(true);
            
            // Set initial processing messages
            statusLabel->setText("Processing...");
            statusLabel->setStyleSheet("color: #BB86FC; margin-top: 8px;");
            progressLabel->setText("Preparing files...");
            progressLabel->setStyleSheet("color: #03DAC6; margin-top: 8px; font-weight: bold;");
            break;
            
        case DialogState::Complete:
            enableControls(false);
            cancelButton->setEnabled(true);
            cancelButton->setText("Done");
            
            // Show success state
            statusLabel->setText("Deck created successfully!");
            statusLabel->setStyleSheet("color: #03DAC6; margin-top: 8px;");
            progressLabel->setText("Your deck is ready to use.");
            progressLabel->setStyleSheet("color: #03DAC6; margin-top: 8px; font-weight: bold;");
            
            // Keep progress elements visible to show completion
            uploadProgressBar->setVisible(true);
            uploadProgressBar->setValue(100);
            statusLabel->setVisible(true);
            progressLabel->setVisible(true);
            break;
            
        case DialogState::Error:
            enableControls(true);
            cancelButton->setEnabled(true);
            cancelButton->setText("Close");
            
            // Show error state
            statusLabel->setStyleSheet("color: #CF6679; margin-top: 8px;");
            progressLabel->setStyleSheet("color: #CF6679; margin-top: 8px; font-weight: bold;");
            
            // Keep progress elements visible to show error
            uploadProgressBar->setVisible(true);
            statusLabel->setVisible(true);
            progressLabel->setVisible(true);
            break;
    }
}

