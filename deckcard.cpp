#include "deckcard.h"
#include <QMouseEvent>
#include <QPainter>
#include <QStyleOption>
#include <QDateTime>
#include <QFont>
#include <QPalette>
#include <QApplication>

DeckCard::DeckCard(const DeckMetadata& deck, QWidget *parent)
    : QWidget(parent), deckId(deck.deckId)
{
    setMinimumSize(250, 180);
    setMaximumSize(350, 250);
    setCursor(Qt::PointingHandCursor);
    
    // Enable mouse tracking for hover effects
    setMouseTracking(true);
    
    // Setup layout and widgets
    setupUi();
    
    // Set deck data
    titleLabel->setText(deck.title);
    countLabel->setText(QString("%1 question%2").arg(deck.questionCount).arg(deck.questionCount != 1 ? "s" : ""));
    
    // Format the date
    QDateTime dateTime = QDateTime::fromString(deck.createdAt, Qt::ISODate);
    dateLabel->setText(dateTime.toString("MMM d, yyyy"));
    
    // Set stylesheet for the card - dark theme with modern look
    setStyleSheet(
        "QWidget#deckCard {"
        "   background-color: #1F1F1F;"
        "   border-radius: 12px;"
        "   border: 1px solid #333333;"
        "}"
        "QLabel#titleLabel {"
        "   font-weight: bold;"
        "   color: #BB86FC;"
        "   font-size: 16px;"
        "}"
        "QLabel#countLabel {"
        "   color: #CCCCCC;"
        "   font-size: 14px;"
        "}"
        "QLabel#dateLabel {"
        "   color: #999999;"
        "   font-size: 12px;"
        "}"
    );
}

void DeckCard::setupUi()
{
    setObjectName("deckCard");
    
    QVBoxLayout *layout = new QVBoxLayout(this);
    layout->setContentsMargins(20, 20, 20, 20);
    layout->setSpacing(10);
    
    // Title label
    titleLabel = new QLabel(this);
    titleLabel->setObjectName("titleLabel");
    titleLabel->setAlignment(Qt::AlignLeft | Qt::AlignTop);
    titleLabel->setWordWrap(true);
    
    // Question count label
    countLabel = new QLabel(this);
    countLabel->setObjectName("countLabel");
    countLabel->setAlignment(Qt::AlignLeft);
    
    // Date label
    dateLabel = new QLabel(this);
    dateLabel->setObjectName("dateLabel");
    dateLabel->setAlignment(Qt::AlignLeft | Qt::AlignBottom);
    
    // Add labels to layout with spacer to push date to bottom
    layout->addWidget(titleLabel);
    layout->addWidget(countLabel);
    layout->addStretch();
    layout->addWidget(dateLabel);
    
    setLayout(layout);
}

void DeckCard::mousePressEvent(QMouseEvent *event)
{
    if (event->button() == Qt::LeftButton) {
        emit clicked(deckId);
    }
    QWidget::mousePressEvent(event);
}

void DeckCard::enterEvent(QEnterEvent *event)
{
    // Apply hover effect - more vibrant with modern look
    setStyleSheet(
        "QWidget#deckCard {"
        "   background-color: #2D2D2D;"
        "   border-radius: 12px;"
        "   border: 1px solid #BB86FC;"
        "}"
        "QLabel#titleLabel {"
        "   font-weight: bold;"
        "   color: #BB86FC;"
        "   font-size: 16px;"
        "}"
        "QLabel#countLabel {"
        "   color: #FFFFFF;"
        "   font-size: 14px;"
        "}"
        "QLabel#dateLabel {"
        "   color: #BBBBBB;"
        "   font-size: 12px;"
        "}"
    );
    
    QWidget::enterEvent(event);
}

void DeckCard::leaveEvent(QEvent *event)
{
    // Restore normal style - dark theme
    setStyleSheet(
        "QWidget#deckCard {"
        "   background-color: #1F1F1F;"
        "   border-radius: 12px;"
        "   border: 1px solid #333333;"
        "}"
        "QLabel#titleLabel {"
        "   font-weight: bold;"
        "   color: #BB86FC;"
        "   font-size: 16px;"
        "}"
        "QLabel#countLabel {"
        "   color: #CCCCCC;"
        "   font-size: 14px;"
        "}"
        "QLabel#dateLabel {"
        "   color: #999999;"
        "   font-size: 12px;"
        "}"
    );
    
    QWidget::leaveEvent(event);
}

void DeckCard::paintEvent(QPaintEvent *event)
{
    // Enable styling with CSS
    QStyleOption opt;
    opt.initFrom(this);
    QPainter p(this);
    style()->drawPrimitive(QStyle::PE_Widget, &opt, &p, this);
    
    QWidget::paintEvent(event);
}
