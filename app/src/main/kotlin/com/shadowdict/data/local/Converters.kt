package com.shadowdict.data.local

import androidx.room.TypeConverter
import com.shadowdict.data.local.entity.LineStatus
import com.shadowdict.data.local.entity.SourceType

/** Enum <-> String converters for Room. */
class Converters {
    @TypeConverter
    fun sourceTypeToString(value: SourceType): String = value.name

    @TypeConverter
    fun stringToSourceType(value: String): SourceType = SourceType.valueOf(value)

    @TypeConverter
    fun lineStatusToString(value: LineStatus): String = value.name

    @TypeConverter
    fun stringToLineStatus(value: String): LineStatus = LineStatus.valueOf(value)
}
