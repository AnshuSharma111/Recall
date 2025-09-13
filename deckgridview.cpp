#include "deckgridview.h"
#include <QLabel>
#include <QMessageBox>
#include <QVBoxLayout>

DeckGridView::DeckGridView(QWidget *parent) : QWidget(parent)
{
    // Create main layout for this widget
    QVBoxLayout *mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    
    // Create scroll area
    scrollArea = new QScrollArea(this);
    scrollArea->setWidgetResizable(true);
    scrollArea->setFrameShape(QFrame::NoFrame);
    scrollArea->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    
    // Create container for grid
    gridContainer = new QWidget();
    
    // Create grid layout with 3 columns
    gridLayout = new QGridLayout(gridContainer);
    gridLayout->setContentsMargins(20, 20, 20, 20);
    gridLayout->setSpacing(20);
    
    // Set container for scroll area
    scrollArea->setWidget(gridContainer);
    
    // Add scroll area to main layout
    mainLayout->addWidget(scrollArea);
    
    // Create and set up deck loader
    deckLoader = new DeckLoader(this);
    connect(deckLoader, &DeckLoader::decksLoaded, this, &DeckGridView::onDecksLoaded);
    connect(deckLoader, &DeckLoader::loadError, this, &DeckGridView::onLoadError);
}

void DeckGridView::loadDecks()
{
    // Clear existing grid
    clearGrid();
    
    // Add loading indicator
    QLabel *loadingLabel = new QLabel("Loading decks...", gridContainer);
    loadingLabel->setAlignment(Qt::AlignCenter);
    gridLayout->addWidget(loadingLabel, 0, 0, 1, 3);
    
    // Load decks
    deckLoader->loadDecks();
}

void DeckGridView::onDecksLoaded(const QVector<DeckMetadata>& decks)
{
    // Clear existing grid including loading indicator
    clearGrid();
    
    if (decks.isEmpty()) {
        // Show no decks message
        QLabel *noDecksLabel = new QLabel("No decks available. Create your first deck to get started!", gridContainer);
        noDecksLabel->setAlignment(Qt::AlignCenter);
        gridLayout->addWidget(noDecksLabel, 0, 0, 1, 3);
        return;
    }
    
    // Add deck cards to grid, 3 per row
    int row = 0;
    int col = 0;
    
    for (const DeckMetadata& deck : decks) {
        DeckCard *card = new DeckCard(deck, gridContainer);
        connect(card, &DeckCard::clicked, this, &DeckGridView::onDeckCardClicked);
        
        gridLayout->addWidget(card, row, col, 1, 1);
        
        // Move to the next column or row
        col++;
        if (col >= 3) {
            col = 0;
            row++;
        }
    }
}

void DeckGridView::onLoadError(const QString& errorMessage)
{
    // Clear grid and show error
    clearGrid();
    
    QLabel *errorLabel = new QLabel("Error loading decks: " + errorMessage, gridContainer);
    errorLabel->setAlignment(Qt::AlignCenter);
    errorLabel->setStyleSheet("color: red;");
    gridLayout->addWidget(errorLabel, 0, 0, 1, 3);
}

void DeckGridView::onDeckCardClicked(const QString& deckId)
{
    emit deckSelected(deckId);
}

void DeckGridView::clearGrid()
{
    // Remove all widgets from grid
    QLayoutItem *child;
    while ((child = gridLayout->takeAt(0)) != nullptr) {
        if (child->widget()) {
            child->widget()->deleteLater();
        }
        delete child;
    }
}
