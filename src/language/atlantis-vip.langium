grammar AtlantisVip

entry Model:
    (
        interfaces+=Interface|
        types+=Type|
        statements+=Statement
    )*;

Statement:
    VarDeclaration | ExpressionStatement;

VarDeclaration:
    'var' varsOfTypes+=VarsOfType ';' (varsOfTypes+=VarsOfType ';')*;

ExpressionStatement:
    expression=Expression ';'?;

NamedElement: View | NamedViewField | Variable | Type;

Interface:
    'interface' name=ID title=STRING? WindowAttributes (',' isCacheable?='cacheable')? ';'
    ('pascal' pascal=STRING)?
    coordinates=Coordinates?
    (
        views+=View |
        types+=Type |
        declarations+=VarDeclaration
    )*
    'end.';

// Variable Declarations
VarsOfType:
    vars+=Variable (',' vars+=Variable)* ':' type=TypeReference;

Variable:
    name=ID;

View:
    'create'? 'view' name=ID?
    (declarations+=VarDeclaration)*
    ('as'? 'select' fields+=ViewField (',' fields+=ViewField)*)?
    ';'
    ;

ViewField: 
    NamedViewField | UnnamedViewField;

NamedViewField:
    expression=Expression '(' 'fieldname' '=' name=ID ')';

UnnamedViewField:
    expression=Expression;

// Expression Hierarchy
Expression:
    LogicalOr;

LogicalOr infers Expression:
    LogicalAnd ({infer BinaryExpression.left=current} operator='or' right=LogicalAnd)*;

LogicalAnd infers Expression:
    Equality ({infer BinaryExpression.left=current} operator='and' right=Equality)*;

Equality infers Expression:
    Comparison ({infer BinaryExpression.left=current} operator=('=' | '!=' | '<>') right=Comparison)*;

Comparison infers Expression:
    Addition ({infer BinaryExpression.left=current} operator=('>' | '<' | '>=' | '<=') right=Addition)*;

Addition infers Expression:
    Multiplication ({infer BinaryExpression.left=current} operator=('+' | '-') right=Multiplication)*;

Multiplication infers Expression:
    MemberCall ({infer BinaryExpression.left=current} operator=('*' | '/' | 'div' | 'mod') right=MemberCall)*;

MemberCall infers Expression: 
    PrimaryExpression 
    (
        {infer MemberCall.previous=current} 
        (
            "." element=[NamedElement:ID] (explicitOperationCall?='('(arguments+=Expression (',' arguments+=Expression)*)?')')? 
        |   (explicitOperationCall?='('(arguments+=Expression (',' arguments+=Expression)*)?')')
        )
    )*;

PrimaryExpression infers Expression:
    '(' Expression ')' |
    UnaryExpression |
    {infer NumberLiteral} value=( HEX | BINARY | FLOAT | INT) | // Literals
    {infer StringLiteral} value=STRING |
    {infer BooleanLiteral} value=('true' | 'false') |
    FeatureCall;

UnaryExpression:
    operator=('not' | '-' | '+') value=Expression;

FeatureCall infers Expression:
	{infer MemberCall}
	(element=[NamedElement:ID] | element=[NamedElement:'self'])
    (explicitOperationCall?='('	( arguments+=Expression (',' arguments+=Expression)* )? ')')?;

// Type System Definitions
Type:
    Record  | 
    UserType;

Record:
    'type' name=ID '=' 'record' 
    fieldsOfTypes+=RecordFieldsOfType ';' (fieldsOfTypes+=RecordFieldsOfType ';')* 'end'';';

RecordFieldsOfType:
    fields+=RecordField (',' fields+=RecordField)* ':' type=TypeReference;

RecordField: 
    name=ID;

UserType:
    'type' name=ID '=' type=TypeReference ';';

TypeReference:
    (component=ID?'::')?
    (
        reference=[Type:ID]
    |   {infer IntType} name=('byte'|'word'|'integer'|'longint'|'comp')
    |   {infer FloatType} name=('double'|'single'|'decimal')('[' precision=INT (',' scale=INT)? ']')?
    |   {infer StringType} name='string' ('['length=INT']')?
    |   {infer BooleanType} name='boolean'
    |   {infer DateType} name='date'
    |   {infer TimeType} name='time'
    |   {infer DateTimeType} name='_datetime'
    |   {infer ArrayType} name='array' '['(leftBound=INT '..')? rightBound=INT']' 'of' arrayType=TypeReference
    )
    ;

// Other Definitions
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
    (','? 'icon' icon=(ID | 'defaultAppIconName')) &
    (','? color=('blue'|'cyan'|'gray')) &
    (','? isCustomSorting?='customSorting');

// Terminals
terminal STRING returns string: /"(\\.|[^"\\])*"|'(\\.|[^\'\\])*'/;
terminal HEX returns number: /[0-9]+[0-9a-fA-F]*[hH]/;
terminal BINARY returns number: /[01]+[bB]/;
terminal FLOAT returns number: /[0-9]+\.[0-9]+([Ee][\+\-]?[0-9]+)?/;
terminal INT returns number: /[0-9]+/;
terminal ID: /[_a-zA-Z][\w_]*/;

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
