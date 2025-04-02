grammar AtlantisVip

entry Model:
    (
        interfaces+=Interface
    )*;

Interface:
    'interface' name=ID title=STRING? WindowAttributes (',' isCacheable?='cacheable')? ';'
    ('pascal' pascal=STRING)?
    coordinates=Coordinates?
    (
        views+=View |
        types+=TypeDeclaration
    )*
    'end.';
View:
    'create'? 'view' name=ID?
    ('var' vars+=VariablesDeclaration ('var'? vars+=VariablesDeclaration)*)?
    ('as'? 'select' fields+=Field (',' fields+=Field)*)?
    ';'
    ;
Field: NamedField|TableField|UnnamedField;
NamedField: expression=Expression '(' 'fieldname' '=' name=Variable ')';
TableField: table=ID '.' name=ID;
UnnamedField: expression=Expression;

Expression:
    Addition;

Addition infers Expression:
    Multiplication ({infer BinaryExpression.left=current} operator=('+' | '-') right=Multiplication)*;

Multiplication infers Expression:
    Exponentiation ({infer BinaryExpression.left=current} operator=('*' | '/' | 'div') right=Exponentiation)*;

Exponentiation infers Expression:
    Modulo ({infer BinaryExpression.left=current} operator='^' right=Modulo)*;

Modulo infers Expression:
    PrimaryExpression ({infer BinaryExpression.left=current} operator='mod' right=PrimaryExpression)*;

PrimaryExpression infers Expression:
    '(' Expression ')' |
    {infer NumberLiteral} value=(INT | HEX | BINARY | FLOAT) |
    {infer StringLiteral} value=STRING |
    {infer BooleanLiteral} value=('true' | 'false') |
    {infer Ref} ref=[Variable];

Type:
    IntType | FloatType | StringType | BooleanType | DateType | TimeType | DateTimeType | ArrayType | RefType;

TypeDeclaration:
    RecordTypeDeclaration | 
    UserTypeDeclaration;

RecordTypeDeclaration:
    'type' name=ID '=' 'record' fields+=RecordField (fields+=RecordField)* 'end'';';

RecordField:
    names+=ID (',' names+=ID)* ':' type=Type ';';

UserTypeDeclaration:
    'type' name=ID '=' type=Type ';';

IntType:
    name='byte'|name='word'|name='integer'|name='longint'|name='comp';
FloatType:
    name='double' | name='single' | name='decimal' ( '[' precision=INT (',' scale=INT)? ']' )?;
StringType:
    name='string'('['length=INT']')?;
BooleanType:
    name='boolean';
DateType:
    name='date';
TimeType:
    name='time';
DateTimeType:
    name='_datetime';
ArrayType:
    name='array' '['(leftBound=INT '..')? rightBound=INT']' 'of' type=[Type];
RefType:
    type=[TypeDeclaration];

VariablesDeclaration:
    names+=Variable (',' names+=Variable)* ':' type=Type ';';

Variable:
    name=ID;

Coordinates:
    ('show' 'at'? '('left=INT? ',' top=INT? ',' right=INT? ',' bottom=INT? ')' (isFixedX?='fixed_x')? (isFixedY?='fixed_y')?';') |
    ('bounds' '('left=INT? ',' top=INT? ',' right=INT? ',' bottom=INT? ')' ';')
    ;
fragment WindowAttributes:
    (','? isAlwaysOnTop?='alwaysOnTop') &
    (','? isAlwaysReturn?='alwaysReturn') &
    (','? isDoAccept?='doAccept') &
    (','? isEscClose?='escClose') &
    (','? isInheritCommands?='inheritCommands') &
    (','? isKeepQueue?='keepQueue') &
    (','? isPushPosition?='pushPosition') &
    (','? isSDIWindow?='SDIWindow') &
    (','? isDialog?='dialog') &
    (','? isLeftToolbar?='leftToolbar') &
    (','? isRightToolbar?='rightToolbar') &
    (','? isTopToolbar?='topToolbar') &
    (','? isDownToolbar?='downToolbar') &
    (','? isIcon?='icon' (ID | 'defaultAppIconName')) &
    (','? color=('blue'|'cyan'|'gray')) &
    (','? isCustomSorting?='customSorting');

QualifiedName returns string:
    (ID'::')? ID ('.' ID)*;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING returns string: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;
terminal HEX returns number: /(\d|[a-fA-F])+h/;
terminal BINARY returns number: /[01]+b/;
terminal FLOAT returns number: /[0-9]+(\.[0-9]+)?([Ee][\+\-]?[0-9]+)?/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
