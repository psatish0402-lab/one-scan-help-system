#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct Expense {
    char date[20];
    char category[30];
    char description[100];
    double amount;
};

void addExpense();  
void viewExpenses();
void totalExpense();

int main() {
    int choice = 0;
    char input[10];

    while (1) {
        printf("\n===== Expense Tracker =====\n");
        printf("1. Add Expense\n");
        printf("2. View All Expenses\n");
        printf("3. View Total Expense\n");
        printf("4. Exit\n");
        printf("Enter your choice: ");
        fgets(input, sizeof(input), stdin);
        input[strcspn(input, "\n")] = 0;
        choice = atoi(input);

        switch (choice) {
            case 1:
                addExpense();
                break;
            case 2:
                viewExpenses();
                break;
            case 3:
                totalExpense();
                break;
            case 4:
                printf("Exiting... Thank you!\n");
                exit(0);
            default:
                printf("Invalid choice! Please select a valid option.\n");
        }
    }

    return 0;
}

void addExpense() {
    FILE *fp;
    struct Expense e;
    char amountStr[20];

    fp = fopen("expenses.txt", "a");
    if (fp == NULL) {
        printf("Error opening file!\n");
        return;
    }

    printf("Enter Date (DD/MM/YYYY): ");
    fgets(e.date, sizeof(e.date), stdin);
    e.date[strcspn(e.date, "\n")] = 0;

    printf("Enter Category (e.g. Food, Travel, Bills): ");
    fgets(e.category, sizeof(e.category), stdin);
    e.category[strcspn(e.category, "\n")] = 0;

    printf("Enter Description: ");
    fgets(e.description, sizeof(e.description), stdin);
    e.description[strcspn(e.description, "\n")] = 0;

    printf("Enter Amount: ");
    fgets(amountStr, sizeof(amountStr), stdin);
    amountStr[strcspn(amountStr, "\n")] = 0;
    e.amount = strtod(amountStr, NULL);

    if (e.amount <= 0) {
        printf("Invalid amount! Must be a positive number.\n");
        fclose(fp);
        return;
    }

    fprintf(fp, "%s,%s,%s,%.2f\n", e.date, e.category, e.description, e.amount);
    fclose(fp);

    printf("✅ Expense added successfully!\n");
}

void viewExpenses() {
    FILE *fp;
    struct Expense e;
    char line[200];
    char descTrunc[31];

    fp = fopen("expenses.txt", "r");
    if (fp == NULL) {
        printf("No records found!\n");
        return;
    }

    printf("\n--- All Expenses ---\n");
    printf("%-15s %-15s %-30s %-10s\n", "Date", "Category", "Description", "Amount");
    printf("--------------------------------------------------------------------------\n");

    while (fgets(line, sizeof(line), fp)) {
        if (sscanf(line, "%[^,],%[^,],%[^,],%lf", e.date, e.category, e.description, &e.amount) == 4) {
            strncpy(descTrunc, e.description, 30);
            descTrunc[30] = '\0';
            printf("%-15s %-15s %-30s %-10.2f\n", e.date, e.category, descTrunc, e.amount);
        }
    }

    fclose(fp);
}

void totalExpense() {
    FILE *fp;
    struct Expense e;
    char line[200];
    double total = 0.0;

    fp = fopen("expenses.txt", "r");
    if (fp == NULL) {
        printf("No records found!\n");
        return;
    }

    while (fgets(line, sizeof(line), fp)) {
        if (sscanf(line, "%[^,],%[^,],%[^,],%lf", e.date, e.category, e.description, &e.amount) == 4) {
            total += e.amount;
        }
    }

    fclose(fp);
    printf("\n💰 Total Expense: ₹%.2f\n", total);


}