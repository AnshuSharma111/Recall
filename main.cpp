#include "mainwindow.h"

#include <QApplication>

int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
    MainWindow w;
    // The MainWindow will show itself after the server is up
    // w.show(); 
    return a.exec();
}
