import {DefaultNamingStrategy, NamingStrategyInterface} from 'typeorm';

function toSnake(str: string): string {
    return str
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toLowerCase();
}

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    tableName(className: string, customName: string): string {
        return customName || toSnake(className);
    }

    columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
        const name = customName ? customName : toSnake(propertyName);
        return embeddedPrefixes.length ? toSnake(embeddedPrefixes.join('_')) + '_' + name : name;
    }

    relationName(propertyName: string): string {
        return toSnake(propertyName);
    }

    joinColumnName(relationName: string, referencedColumnName: string): string {
        return toSnake(`${relationName}_${referencedColumnName}`);
    }

    joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
        return toSnake(`${tableName}_${columnName || propertyName}`);
    }
}
