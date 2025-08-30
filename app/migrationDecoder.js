// Google Authenticator Migration Decoder
// Decodes otpauth-migration:// URLs from Google Authenticator export QR codes

class MigrationDecoder {
    constructor() {
        // Wire types for protobuf
        this.WIRE_TYPES = {
            VARINT: 0,
            FIXED64: 1,
            LENGTH_DELIMITED: 2,
            FIXED32: 5
        };
    }

    // Decode base64 URL-safe to regular base64
    base64UrlToBase64(base64url) {
        let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if necessary
        while (base64.length % 4) {
            base64 += '=';
        }
        return base64;
    }

    // Convert base64 to byte array
    base64ToBytes(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    // Read a varint from the buffer
    readVarint(buffer, offset) {
        let result = 0;
        let shift = 0;
        let byte;
        do {
            if (offset >= buffer.length) {
                throw new Error('Unexpected end of buffer');
            }
            byte = buffer[offset++];
            result |= (byte & 0x7F) << shift;
            shift += 7;
        } while (byte & 0x80);
        return { value: result, offset };
    }

    // Read field tag and wire type
    readTag(buffer, offset) {
        const { value, offset: newOffset } = this.readVarint(buffer, offset);
        const fieldNumber = value >> 3;
        const wireType = value & 0x07;
        return { fieldNumber, wireType, offset: newOffset };
    }

    // Read length-delimited field
    readLengthDelimited(buffer, offset) {
        const { value: length, offset: dataOffset } = this.readVarint(buffer, offset);
        if (dataOffset + length > buffer.length) {
            throw new Error('Length exceeds buffer size');
        }
        const data = buffer.slice(dataOffset, dataOffset + length);
        return { data, offset: dataOffset + length };
    }

    // Convert bytes to base32 (for secret)
    bytesToBase32(bytes) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let result = '';
        let buffer = 0;
        let bufferLength = 0;

        for (let i = 0; i < bytes.length; i++) {
            buffer = (buffer << 8) | bytes[i];
            bufferLength += 8;

            while (bufferLength >= 5) {
                bufferLength -= 5;
                result += alphabet[(buffer >> bufferLength) & 0x1F];
            }
        }

        if (bufferLength > 0) {
            result += alphabet[(buffer << (5 - bufferLength)) & 0x1F];
        }

        return result;
    }

    // Parse OTP parameters from protobuf
    parseOtpParameters(data) {
        let offset = 0;
        const params = {
            secret: null,
            name: '',
            issuer: '',
            algorithm: 1, // SHA1 default
            digits: 6,
            type: 2, // TOTP default
            counter: 0,
            period: 30 // Default period for TOTP
        };

        while (offset < data.length) {
            const tag = this.readTag(data, offset);
            offset = tag.offset;

            switch (tag.fieldNumber) {
                case 1: // secret
                    if (tag.wireType === this.WIRE_TYPES.LENGTH_DELIMITED) {
                        const field = this.readLengthDelimited(data, offset);
                        params.secret = this.bytesToBase32(field.data);
                        offset = field.offset;
                    }
                    break;
                    
                case 2: // name
                    if (tag.wireType === this.WIRE_TYPES.LENGTH_DELIMITED) {
                        const field = this.readLengthDelimited(data, offset);
                        params.name = new TextDecoder().decode(field.data);
                        offset = field.offset;
                    }
                    break;
                    
                case 3: // issuer
                    if (tag.wireType === this.WIRE_TYPES.LENGTH_DELIMITED) {
                        const field = this.readLengthDelimited(data, offset);
                        params.issuer = new TextDecoder().decode(field.data);
                        offset = field.offset;
                    }
                    break;
                    
                case 4: // algorithm
                    if (tag.wireType === this.WIRE_TYPES.VARINT) {
                        const field = this.readVarint(data, offset);
                        params.algorithm = field.value;
                        offset = field.offset;
                    }
                    break;
                    
                case 5: // digits
                    if (tag.wireType === this.WIRE_TYPES.VARINT) {
                        const field = this.readVarint(data, offset);
                        // Convert enum: 1 = 6 digits, 2 = 8 digits
                        params.digits = field.value === 2 ? 8 : 6;
                        offset = field.offset;
                    }
                    break;
                    
                case 6: // type
                    if (tag.wireType === this.WIRE_TYPES.VARINT) {
                        const field = this.readVarint(data, offset);
                        params.type = field.value;
                        offset = field.offset;
                    }
                    break;
                    
                case 7: // counter
                    if (tag.wireType === this.WIRE_TYPES.VARINT) {
                        const field = this.readVarint(data, offset);
                        params.counter = field.value;
                        offset = field.offset;
                    }
                    break;
                    
                default:
                    // Skip unknown fields
                    if (tag.wireType === this.WIRE_TYPES.VARINT) {
                        const field = this.readVarint(data, offset);
                        offset = field.offset;
                    } else if (tag.wireType === this.WIRE_TYPES.LENGTH_DELIMITED) {
                        const field = this.readLengthDelimited(data, offset);
                        offset = field.offset;
                    } else {
                        // Skip other wire types
                        offset++;
                    }
            }
        }

        return params;
    }

    // Parse the main payload
    parsePayload(data) {
        let offset = 0;
        const entries = [];
        
        while (offset < data.length) {
            const tag = this.readTag(data, offset);
            offset = tag.offset;

            if (tag.fieldNumber === 1 && tag.wireType === this.WIRE_TYPES.LENGTH_DELIMITED) {
                // OTP Parameters
                const field = this.readLengthDelimited(data, offset);
                const params = this.parseOtpParameters(field.data);
                entries.push(params);
                offset = field.offset;
            } else {
                // Skip other fields
                if (tag.wireType === this.WIRE_TYPES.VARINT) {
                    const field = this.readVarint(data, offset);
                    offset = field.offset;
                } else if (tag.wireType === this.WIRE_TYPES.LENGTH_DELIMITED) {
                    const field = this.readLengthDelimited(data, offset);
                    offset = field.offset;
                } else {
                    offset++;
                }
            }
        }

        return entries;
    }

    // Main decode function
    decode(migrationUrl) {
        try {
            console.log('Decoding migration URL...');
            
            // Check if it's a migration URL
            if (!migrationUrl.startsWith('otpauth-migration://offline?data=')) {
                throw new Error('Not a valid migration URL');
            }

            // Extract the data parameter
            const dataParam = migrationUrl.split('data=')[1];
            if (!dataParam) {
                throw new Error('No data parameter found');
            }
            
            console.log('Data param length:', dataParam.length);

            // Decode from base64 URL
            const base64 = this.base64UrlToBase64(decodeURIComponent(dataParam));
            const bytes = this.base64ToBytes(base64);
            
            console.log('Decoded bytes length:', bytes.length);

            // Parse the protobuf payload
            const entries = this.parsePayload(bytes);
            console.log('Parsed entries count:', entries.length);

            // Convert to our format
            return entries.map(entry => {
                // Only support TOTP for now (type === 2)
                if (entry.type !== 2) {
                    console.warn('Skipping non-TOTP entry:', entry);
                    return null;
                }

                return {
                    secret: entry.secret,
                    account: entry.name || '',
                    issuer: entry.issuer || '',
                    period: entry.period || 30,
                    type: 'totp'
                };
            }).filter(e => e !== null);

        } catch (error) {
            console.error('Migration decode error:', error);
            throw new Error(`Failed to decode migration data: ${error.message}`);
        }
    }

    // Helper to check if a string looks like a migration URL
    isMigrationUrl(url) {
        return url && url.startsWith('otpauth-migration://');
    }
}

module.exports = MigrationDecoder;