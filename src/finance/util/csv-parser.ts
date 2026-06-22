import {BankImportProfile} from '../entity/bank-import-profile.entity';
import {AmountConvention} from '../enum/finance.enum';

export interface NormalisedRow {
    date: string;
    narration: string;
    amount: number;
    creditDebit: 'CREDIT' | 'DEBIT';
}

export interface RowError {
    row: number;
    column: string;
    expected: string;
    found: string;
}

export interface ValidationResult {
    isValid: boolean;
    totalRows: number;
    validRows: number;
    failedRows: RowError[];
    firstFailure: RowError | null;
}

export class CsvParser {
    static splitLine(line: string, delimiter: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    static parseDate(raw: string, format: string): string | null {
        if (!raw) return null;
        const s = raw.trim();
        let year: string, month: string, day: string;

        switch (format) {
            case 'YYYY-MM-DD': {
                const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (!m) return null;
                [, year, month, day] = m;
                break;
            }
            case 'DD/MM/YYYY': {
                const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (!m) return null;
                [, day, month, year] = m;
                break;
            }
            case 'DD-MM-YYYY': {
                const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (!m) return null;
                [, day, month, year] = m;
                break;
            }
            case 'MM/DD/YYYY': {
                const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (!m) return null;
                [, month, day, year] = m;
                break;
            }
            default:
                return null;
        }

        const d = new Date(`${year}-${month}-${day}`);
        if (isNaN(d.getTime())) return null;
        return `${year}-${month}-${day}`;
    }

    static normaliseRow(cols: string[], profile: BankImportProfile): NormalisedRow | RowError {
        const dateRaw = cols[profile.dateColumnIndex] ?? '';
        const date = CsvParser.parseDate(dateRaw, profile.dateFormat);
        if (!date) return {row: -1, column: 'date', expected: profile.dateFormat, found: dateRaw};

        const narration = cols[profile.narrationColumnIndex]?.trim() ?? '';

        switch (profile.amountConvention) {
            case AmountConvention.SIGNED: {
                const raw = cols[profile.amountColumnIndex ?? -1] ?? '';
                const value = parseFloat(raw.replace(/,/g, ''));
                if (isNaN(value)) return {row: -1, column: 'amount', expected: 'signed number', found: raw};
                return {date, narration, amount: Math.abs(value), creditDebit: value < 0 ? 'DEBIT' : 'CREDIT'};
            }
            case AmountConvention.SEPARATE_COLUMNS: {
                const debitRaw = cols[profile.debitColumnIndex ?? -1] ?? '';
                const creditRaw = cols[profile.creditColumnIndex ?? -1] ?? '';
                const debit = parseFloat(debitRaw.replace(/,/g, ''));
                const credit = parseFloat(creditRaw.replace(/,/g, ''));
                const hasDebit = !isNaN(debit) && debit > 0;
                const hasCredit = !isNaN(credit) && credit > 0;
                if (!hasDebit && !hasCredit) {
                    return {row: -1, column: 'debit/credit', expected: 'at least one positive value', found: `debit=${debitRaw}, credit=${creditRaw}`};
                }
                return {date, narration, amount: hasDebit ? debit : credit, creditDebit: hasDebit ? 'DEBIT' : 'CREDIT'};
            }
            case AmountConvention.AMOUNT_WITH_TYPE: {
                const amtRaw = cols[profile.amountColumnIndex ?? -1] ?? '';
                const amount = parseFloat(amtRaw.replace(/,/g, ''));
                if (isNaN(amount)) return {row: -1, column: 'amount', expected: 'number', found: amtRaw};

                const typeRaw = cols[profile.typeColumnIndex ?? -1]?.trim() ?? '';
                const typeUpper = typeRaw.toUpperCase();
                const debitIndicator = (profile.debitIndicator ?? 'DEBIT').toUpperCase();
                const creditIndicator = (profile.creditIndicator ?? 'CREDIT').toUpperCase();
                if (typeUpper !== debitIndicator && typeUpper !== creditIndicator) {
                    return {row: -1, column: 'type', expected: `${debitIndicator}/${creditIndicator}`, found: typeRaw};
                }
                return {date, narration, amount: Math.abs(amount), creditDebit: typeUpper === debitIndicator ? 'DEBIT' : 'CREDIT'};
            }
        }
    }

    static validate(content: string, profile: BankImportProfile): ValidationResult {
        const allLines = content.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim().length > 0);
        const dataLines = allLines.slice(profile.skipHeaderRows);

        const failedRows: RowError[] = [];
        let validRows = 0;

        for (let i = 0; i < dataLines.length; i++) {
            const rowNum = i + 1 + profile.skipHeaderRows;
            const cols = CsvParser.splitLine(dataLines[i], profile.delimiter);
            const result = CsvParser.normaliseRow(cols, profile);
            if ('column' in result) {
                failedRows.push({...result, row: rowNum});
            } else {
                validRows++;
            }
        }

        return {
            isValid: failedRows.length === 0,
            totalRows: dataLines.length,
            validRows,
            failedRows,
            firstFailure: failedRows[0] ?? null,
        };
    }

    static parseAll(content: string, profile: BankImportProfile): NormalisedRow[] {
        const allLines = content.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim().length > 0);
        const dataLines = allLines.slice(profile.skipHeaderRows);
        const rows: NormalisedRow[] = [];
        for (const line of dataLines) {
            const cols = CsvParser.splitLine(line, profile.delimiter);
            const result = CsvParser.normaliseRow(cols, profile);
            if (!('column' in result)) rows.push(result);
        }
        return rows;
    }

    static formatSampleDate(format: string, dayOffset: number): string {
        const d = new Date();
        d.setDate(d.getDate() - dayOffset);
        const y = d.getFullYear().toString();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        switch (format) {
            case 'DD/MM/YYYY': return `${day}/${m}/${y}`;
            case 'DD-MM-YYYY': return `${day}-${m}-${y}`;
            case 'MM/DD/YYYY': return `${m}/${day}/${y}`;
            default: return `${y}-${m}-${day}`;
        }
    }

    static buildTemplateHeaders(profile: BankImportProfile): string[] {
        const maxIndex = Math.max(
            profile.dateColumnIndex,
            profile.narrationColumnIndex,
            profile.amountColumnIndex ?? 0,
            profile.typeColumnIndex ?? 0,
            profile.debitColumnIndex ?? 0,
            profile.creditColumnIndex ?? 0,
        );
        const headers = new Array<string>(maxIndex + 1).fill('');
        headers[profile.dateColumnIndex] = profile.dateColumnName ?? 'Date';
        headers[profile.narrationColumnIndex] = profile.narrationColumnName ?? 'Narration';
        switch (profile.amountConvention) {
            case AmountConvention.SIGNED:
                headers[profile.amountColumnIndex!] = profile.amountColumnName ?? 'Amount';
                break;
            case AmountConvention.SEPARATE_COLUMNS:
                headers[profile.debitColumnIndex!] = profile.debitColumnName ?? 'Debit';
                headers[profile.creditColumnIndex!] = profile.creditColumnName ?? 'Credit';
                break;
            case AmountConvention.AMOUNT_WITH_TYPE:
                headers[profile.amountColumnIndex!] = profile.amountColumnName ?? 'Amount';
                headers[profile.typeColumnIndex!] = profile.typeColumnName ?? 'Type';
                break;
        }
        return headers;
    }
}
